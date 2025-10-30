<template>
  <v-app>
    <v-app-bar color="primary" dark>
      <v-app-bar-title>
        <v-icon class="mr-2">mdi-school</v-icon>
        Tableau de Bord Étudiant
      </v-app-bar-title>

      <v-spacer />

      <!-- AJOUTÉ: Bouton global pour ouvrir le scanner (de Fichier 1) -->
      <v-btn color="secondary" @click="openScannerDialog" class="mr-3">
        <v-icon left>mdi-qrcode-scan</v-icon>Scanner
      </v-btn>

      <v-btn icon @click="logout">
        <v-icon>mdi-logout</v-icon>
      </v-btn>
    </v-app-bar>

    <v-main>
      <v-container>
        <!-- Section Info (de Fichier 2) -->
        <v-row>
          <v-col cols="12">
            <v-card class="mb-6">
              <v-card-title>
                <v-icon class="mr-2">mdi-account</v-icon>
                Bienvenue, {{ user?.nom || 'Chargement...' }}
              </v-card-title>
              <v-card-subtitle v-if="user">Matricule: {{ user.matricule }}</v-card-subtitle>
            </v-card>
          </v-col>
        </v-row>

        <!-- Sections Stats & Actions (de Fichier 2) -->
        <v-row>
          <v-col cols="12" md="6">
            <v-card>
              <v-card-title>
                <v-icon class="mr-2">mdi-chart-box</v-icon>
                Statistiques
              </v-card-title>
              <v-card-text>
                <v-list>
                  <v-list-item>
                    <v-list-item-title>Total des présences</v-list-item-title>
                    <v-list-item-subtitle class="text-h4 text-primary">
                      {{ myPresences.length }}
                    </v-list-item-subtitle>
                  </v-list-item>
                </v-list>
              </v-card-text>
            </v-card>
          </v-col>

          <v-col cols="12" md="6">
            <v-card>
              <v-card-title>
                <v-icon class="mr-2">mdi-account-details</v-icon>
                Actions Rapides
              </v-card-title>
              <v-card-text>
                <p class="text-body-2 mb-3">
                  Scannez un QR code de session pour enregistrer votre présence
                </p>
                <!-- AJOUTÉ: Affiche le QR scanné s'il existe -->
                <div v-if="qrUrl" class="mb-3">
                  <strong>Dernier QR scanné :</strong>
                  <div style="word-break:break-all">{{ qrUrl }}</div>
                </div>
                <v-alert type="info" variant="tonal" density="compact">
                  Le professeur génère un QR code à scanner pendant le cours
                </v-alert>
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>

        <!-- Historique des Présences (de Fichier 2) -->
        <v-row>
          <v-col cols="12">
            <v-card>
              <v-card-title>
                <v-icon class="mr-2">mdi-history</v-icon>
                Historique des Présences
                <v-spacer></v-spacer>
                <v-btn color="primary" variant="outlined" @click="loadMyPresences" :loading="loadingPresences">
                  <v-icon class="mr-2">mdi-refresh</v-icon>
                  Actualiser
                </v-btn>
              </v-card-title>
              <v-card-text>
                <div v-if="myPresences.length === 0" class="text-center text-medium-emphasis py-8">
                  <v-icon size="64" color="grey">mdi-clipboard-list-outline</v-icon>
                  <p class="mt-2">Aucune présence enregistrée</p>
                </div>

                <v-data-table
                  v-else
                  :headers="presenceHeaders"
                  :items="myPresences"
                  :items-per-page="10"
                  class="elevation-1"
                >
                  <template #item.date_heure="{ item }">
                    {{ formatDateTime(item.date_heure) }}
                  </template>
                  <template #item.course_name="{ item }">
                    <v-chip size="small" color="primary" variant="tonal">
                      {{ item.course_name || 'N/A' }}
                    </v-chip>
                  </template>
                </v-data-table>
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>
      </v-container>
    </v-main>

    <!-- AJOUTÉ: Scanner dialog (modal) (de Fichier 1) -->
    <v-dialog v-model="scannerDialog" persistent width="900">
      <v-card>
        <v-toolbar flat>
          <v-toolbar-title><v-icon class="mr-2">mdi-qrcode-scan</v-icon> Scanner</v-toolbar-title>
          <v-spacer />
          <v-switch v-model="autoSubmit" label="Envoi auto après scan" />
          <v-btn icon @click="closeScannerDialog"><v-icon>mdi-close</v-icon></v-btn>
        </v-toolbar>

        <v-card-text>
          <v-row>
            <v-col cols="12" md="4">
              <!-- Liste des caméras (ne provoque PAS de popup) -->
              <v-select
                v-model="selectedDeviceId"
                :items="cameraDevices"
                item-title="label"
                item-value="deviceId"
                label="Caméra"
                dense
                :loading="loadingDevices"
                hide-details
              />

              <div class="mt-3">
                <!-- LANCER est le moment où on demande la permission -->
                <v-btn color="success" @click="requestAndStart" :loading="loadingPermission || scannerRunning" :disabled="scannerRunning">
                  <v-icon left>mdi-camera</v-icon>Lancer la caméra
                </v-btn>

                <v-btn color="error" @click="stopScanner" class="ml-2" :disabled="!scannerRunning">
                  <v-icon left>mdi-camera-off</v-icon>Arrêter
                </v-btn>
              </div>

              <div class="mt-4">
                <v-btn small color="primary" @click="refreshDevices" :loading="loadingDevices">
                  <v-icon left>mdi-refresh</v-icon>Rafraîchir caméras
                </v-btn>
              </div>

              <div v-if="permissionMessage" class="mt-4" style="color:#c62828">{{ permissionMessage }}</div>
              <div v-if="lastError" class="mt-3">
                <strong>Erreur :</strong>
                <pre style="white-space:pre-wrap; background:#f5f5f5; padding:6px; border-radius:4px;">{{ lastError }}</pre>
              </div>
            </v-col>

            <v-col cols="12" md="8">
              <!-- preview video (apparaît seulement si permission accordée et previewActive true) -->
              <div v-if="previewActive" class="preview-wrap mb-2">
                <video ref="videoEl" autoplay playsinline muted style="width:100%; height:360px; object-fit:cover; border-radius:6px;"></video>
              </div>

              <!-- html5-qrcode container (fallback) -->
              <div id="qr-reader" ref="qrReaderEl" style="width:100%; height:360px; background:#000; border-radius:6px; display:flex;align-items:center;justify-content:center">
                <div v-if="!scannerRunning && !permissionMessage" style="color:#fff">Scanner inactif</div>
              </div>
            </v-col>
          </v-row>
        </v-card-text>

        <v-card-actions>
          <v-spacer />
          <v-btn color="primary" @click="confirmAndClose" :disabled="!qrUrl" :loading="checkingAttendance">
            <v-icon left>mdi-check</v-icon> Confirmer Présence
          </v-btn>
          <v-btn text @click="closeScannerDialog">Fermer</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>


    <v-snackbar v-model="snackbar.show" :color="snackbar.color">
      {{ snackbar.text }}
    </v-snackbar>
  </v-app>
</template>

<script setup lang="ts">
// AJOUTÉ: Imports de Fichier 1 (nextTick, onBeforeUnmount)
import { ref, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import AuthService from '../services/auth.service'
import AttendanceService, { type AttendanceRecord } from '../services/attendance.service'

/* ---------- AJOUTÉ: error helper (de Fichier 1) ---------- */
type ErrorInfo = { message: string; name?: string }

function getErrorInfo(err: unknown): ErrorInfo {
  if (err == null) return { message: String(err) }
  if (err instanceof Error) return { message: err.message, name: err.name }
  if (typeof err === 'object') {
    try {
      const anyErr = err as Record<string, unknown>
      const message = anyErr.message ?? anyErr.error ?? JSON.stringify(anyErr)
      const name = typeof anyErr.name === 'string' ? anyErr.name : undefined
      return { message: String(message), name }
    } catch {
      return { message: String(err) }
    }
  }
  return { message: String(err) }
}


/* ---------- state (Fichier 2) ---------- */
const router = useRouter()
const user = ref<any>(null)
// Note: Le type 'AttendanceRecord' vient de Fichier 2
const myPresences = ref<AttendanceRecord[]>([])
const loadingPresences = ref(false)
const snackbar = ref({
  show: false,
  text: '',
  color: 'success'
})

const presenceHeaders = [
  { title: 'Cours', key: 'course_name' },
  { title: 'Date/Heure', key: 'date_heure' },
]

/* ---------- AJOUTÉ: state (de Fichier 1) ---------- */
const qrUrl = ref('')
const checkingAttendance = ref(false)
const lastError = ref('')

/* AJOUTÉ: scanner dialog state (de Fichier 1) */
const scannerDialog = ref(false)
const autoSubmit = ref(false)
const qrReaderEl = ref<HTMLElement | null>(null)
const videoEl = ref<HTMLVideoElement | null>(null)
let localStream: MediaStream | null = null
let scannerInstance: any = null
const scannerRunning = ref(false)
const previewActive = ref(false)
const permissionMessage = ref('')
const loadingDevices = ref(false)
const loadingPermission = ref(false)
const cameraDevices = ref<Array<{ deviceId: string; label: string }>>([])
const selectedDeviceId = ref<string | null>(null)


/* ---------- MODIFIÉ: onMounted (Fusion de Fichier 1 & 2) ---------- */
onMounted(async () => {
  // Logique de Fichier 2
  const currentUser = await AuthService.getCurrentUser()
  if (!currentUser || currentUser.type !== 'student') {
    router.push('/login')
    return
  }
  user.value = currentUser
  await loadMyPresences()

  // AJOUTÉ: Logique de Fichier 1
  // initial devices list (no permission popup)
  await refreshDevices()
})

/* ---------- AJOUTÉ: onBeforeUnmount (de Fichier 1) ---------- */
onBeforeUnmount(async () => {
  try { await stopScanner(); await stopPreview() } catch (_) {}
})


/* ---------- helpers (Fichier 2) ---------- */
const showSnackbar = (text: string, color = 'success') => {
  snackbar.value = { show: true, text, color }
}

/* ---------- AJOUTÉ: setLastError (de Fichier 1) ---------- */
function setLastError(err: unknown) {
  const info = getErrorInfo(err)
  lastError.value = info.message
  // console useful for debugging
  // eslint-disable-next-line no-console
  console.debug('ErrorInfo:', info)
}

/* ---------- AJOUTÉ: camera & devices (de Fichier 1) ---------- */
const refreshDevices = async () => {
  loadingDevices.value = true
  permissionMessage.value = ''
  try {
    if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
      permissionMessage.value = "navigator.mediaDevices.enumerateDevices() non supporté."
      cameraDevices.value = []
      loadingDevices.value = false
      return
    }

    // We do NOT call getUserMedia() here — labels may be empty until permission
    const devices = await navigator.mediaDevices.enumerateDevices()
    const cams = devices
      .filter(d => d.kind === 'videoinput')
      .map(d => ({ deviceId: d.deviceId, label: d.label || `Caméra ${d.deviceId.slice(-4)}` }))
    cameraDevices.value = cams
    if (cams.length && !selectedDeviceId.value) selectedDeviceId.value = cams[0].deviceId
  } catch (err: unknown) {
    setLastError(err)
    const info = getErrorInfo(err)
    permissionMessage.value = 'Impossible de lister les caméras : ' + info.message
  } finally { loadingDevices.value = false }
}

/* ---------- AJOUTÉ: preview & scanner (de Fichier 1) ---------- */
async function stopPreview() {
  try {
    if (localStream) {
      localStream.getTracks().forEach(t => t.stop())
      localStream = null
    }
    if (videoEl.value) videoEl.value.srcObject = null
    previewActive.value = false
  } catch (err: unknown) {
    setLastError(err)
  }
}

async function startPreviewForDevice(deviceId: string) {
  await stopPreview()
  loadingPermission.value = true
  try {
    // this request WILL trigger the browser permission popup
    const constraints: MediaStreamConstraints = { video: { deviceId: { exact: deviceId } } }
    localStream = await navigator.mediaDevices.getUserMedia(constraints)
    if (videoEl.value) {
      videoEl.value.srcObject = localStream
      try { await videoEl.value.play() } catch (_) {}
      previewActive.value = true
    }
    loadingPermission.value = false
    permissionMessage.value = ''
    return true
  } catch (err: unknown) {
    loadingPermission.value = false
    setLastError(err)
    const info = getErrorInfo(err)
    permissionMessage.value = info.name === 'NotAllowedError' ? 'Permission caméra refusée.' :
      info.name === 'NotFoundError' ? "Aucune caméra trouvée." :
      'Erreur preview: ' + info.message
    throw err
  }
}

const requestAndStart = async () => {
  if (!selectedDeviceId.value) { permissionMessage.value = 'Sélectionne une caméra.'; return }
  permissionMessage.value = ''
  lastError.value = ''
  try {
    // explicit permission request here
    await startPreviewForDevice(selectedDeviceId.value)
  } catch (_err) {
    return // message already set inside startPreviewForDevice
  }
  await nextTick()
  await startScanner(selectedDeviceId.value)
}

const startScanner = async (deviceId: string) => {
  if (scannerRunning.value) return
  if (!qrReaderEl.value) { permissionMessage.value = 'Container scanner introuvable'; return }
  try {
    const module = await import('html5-qrcode')
    const Html5Qrcode = (module as any).Html5Qrcode
    if (!Html5Qrcode) { permissionMessage.value = 'module html5-qrcode non trouvé'; return }

    try { await stopScanner() } catch (e) { /* ignore */ }

    if (!qrReaderEl.value.id) qrReaderEl.value.id = 'qr-reader'
    scannerInstance = new Html5Qrcode(qrReaderEl.value.id)
    const cameraConfig = { deviceId: { exact: deviceId } }
    const config = { fps: 10, qrbox: 250 }

    await scannerInstance.start(
      cameraConfig,
      config,
      async (decodedText: string) => {
        qrUrl.value = decodedText
        showSnackbar('QR Code détecté !', 'success')
        if (autoSubmit.value) {
          try {
            // ADAPTÉ: Appelle checkAttendance() qui est maintenant fusionné
            await checkAttendance()
          } catch (e) {
            // nothing special — checkAttendance handles errors
          }
          await stopScanner()
          await stopPreview()
          scannerDialog.value = false
        }
      },
      (_errMsg: any) => { /* per-frame errors are ignored */ }
    )
    scannerRunning.value = true
  } catch (err: unknown) {
    setLastError(err)
    const info = getErrorInfo(err)
    scannerRunning.value = false
    if (info.name === 'NotAllowedError') permissionMessage.value = 'Permission caméra refusée.'
    else if (info.name === 'NotFoundError') permissionMessage.value = "Aucune caméra détectée."
    else permissionMessage.value = 'Impossible de démarrer le scanner: ' + info.message
  }
}

const stopScanner = async () => {
  try {
    if (scannerInstance && typeof scannerInstance.stop === 'function') await scannerInstance.stop()
    if (scannerInstance && typeof scannerInstance.clear === 'function') await scannerInstance.clear()
  } catch (err: unknown) {
    setLastError(err)
  }
  scannerInstance = null
  scannerRunning.value = false
}

/* ---------- AJOUTÉ/ADAPTÉ: attendance & data (Fusion) ---------- */
const checkAttendance = async () => {
  if (!qrUrl.value || !user.value) return
  checkingAttendance.value = true
  try {
    const url = new URL(qrUrl.value)
    const sessionId = url.searchParams.get('session_id')
    const token = url.searchParams.get('token')

    if (!sessionId || !token) {
      showSnackbar('QR Code invalide', 'error')
      checkingAttendance.value = false // Arrêter le chargement
      return
    }

    // --- NOTE D'ADAPTATION ---
    // J'utilise AttendanceService (de Fichier 2) au lieu de ApiService (de Fichier 1)
    // J'ai supposé que le service a une méthode `checkIn` qui prend le matricule.
    // (Le matricule est disponible dans user.value selon le template de Fichier 2)
    const response = await AttendanceService.checkIn({
      matricule: user.value.matricule,
      session_id: sessionId,
      token: token
    })

    // La logique de succès est celle de Fichier 1
    if (response.status === 'success') {
      showSnackbar('Présence enregistrée!', 'success')
      qrUrl.value = ''
      loadMyPresences() // Cette fonction existe déjà dans Fichier 2!
    } else {
      showSnackbar(response.message || 'Erreur enregistrement', 'error')
    }
  } catch (err: unknown) {
    setLastError(err) // Helper de Fichier 1
    const info = getErrorInfo(err) // Helper de Fichier 1
    showSnackbar('Erreur enregistrement: ' + info.message, 'error')
  } finally {
    checkingAttendance.value = false
  }
}


/* ---------- other features (Fichier 2) ---------- */
const loadMyPresences = async () => {
  if (!user.value) return

  loadingPresences.value = true
  try {
    // Utilise AttendanceService de Fichier 2
    const data = await AttendanceService.getStudentAttendance(user.value.id)
    myPresences.value = data
  } catch (error: any) {
    console.error('Erreur de chargement des présences:', error)
    showSnackbar('Erreur lors du chargement de l\'historique', 'error')
  } finally {
    loadingPresences.value = false
  }
}

/* ---------- AJOUTÉ: dialog control (de Fichier 1) ---------- */
const openScannerDialog = async () => {
  scannerDialog.value = true
  await nextTick()
  if (qrReaderEl.value && !qrReaderEl.value.id) qrReaderEl.value.id = 'qr-reader'
  // refresh device list WITHOUT asking permission
  await refreshDevices()
}

const closeScannerDialog = async () => {
  await stopScanner()
  await stopPreview()
  scannerDialog.value = false
}

const confirmAndClose = async () => {
  if (!qrUrl.value) { showSnackbar('Aucun QR scanné', 'error'); return }
  await checkAttendance()
  await stopScanner()
  await stopPreview()
  scannerDialog.value = false
}


/* ---------- misc (Fichier 2) ---------- */
const formatDateTime = (dateTime: string) => {
  return new Date(dateTime).toLocaleString('fr-FR')
}

const logout = () => {
  AuthService.logout()
  router.push('/login')
}
</script>

<!-- AJOUTÉ: Style (de Fichier 1) -->
<style scoped>
.preview-wrap video { width:100%; height:100%; object-fit:cover; border-radius:6px; }
.qr-box { border-radius:6px; overflow:hidden; min-height:260px; background:#000; display:flex; align-items:center; justify-content:center; }
</style>
