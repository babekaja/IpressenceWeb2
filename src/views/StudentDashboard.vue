<template>
  <v-app>
    <v-app-bar color="primary" dark>
      <v-app-bar-title>
        <v-icon class="mr-2">mdi-school</v-icon>
        Tableau de Bord Étudiant
      </v-app-bar-title>

      <v-spacer />

      <v-btn color="secondary" @click="openScannerDialog" class="mr-3">
        <v-icon left>mdi-qrcode-scan</v-icon>Scanner
      </v-btn>

      <v-btn icon @click="logout">
        <v-icon>mdi-logout</v-icon>
      </v-btn>
    </v-app-bar>

    <v-main>
      <v-container>
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
              <div class="mt-3">
                <v-btn color="success" @click="requestAndStart" :loading="loadingPermission || scannerRunning" :disabled="scannerRunning">
                  <v-icon left>mdi-camera</v-icon>Lancer la caméra
                </v-btn>

                <v-btn color="error" @click="stopScanner" class="ml-2" :disabled="!scannerRunning">
                  <v-icon left>mdi-camera-off</v-icon>Arrêter
                </v-btn>
              </div>

              <div v-if="permissionMessage" class="mt-4" style="color:#c62828">{{ permissionMessage }}</div>
              <div v-if="lastError" class="mt-3">
                <strong>Erreur :</strong>
                <pre style="white-space:pre-wrap; background:#f5f5f5; padding:6px; border-radius:4px;">{{ lastError }}</pre>
              </div>
            </v-col>

            <v-col cols="12" md="8">
              <div v-if="previewActive" class="preview-wrap mb-2">
                <video ref="videoEl" autoplay playsinline muted style="width:100%; height:360px; object-fit:cover; border-radius:6px;"></video>
              </div>

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
// 3. IMPORTS MIS À JOUR
import { ref, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import AuthService from '../services/auth.service'
import AttendanceService, { type AttendanceRecord } from '../services/attendance.service'

// 4. FONCTION HELPER POUR LES ERREURS (AJOUTÉE)
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


/* ---------- état (existant) ---------- */
const router = useRouter()
const user = ref<any>(null)
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

/* ---------- 5. ÉTAT POUR LE SCANNER (AJOUTÉ) ---------- */
const qrUrl = ref('')
const checkingAttendance = ref(false)
const scannerDialog = ref(false)
const autoSubmit = ref(false)
const qrReaderEl = ref<HTMLElement | null>(null)
const videoEl = ref<HTMLVideoElement | null>(null)
let localStream: MediaStream | null = null
let scannerInstance: any = null
const scannerRunning = ref(false)
const previewActive = ref(false)
const permissionMessage = ref('')
const lastError = ref('')
const loadingPermission = ref(false)


/* ---------- 6. NOUVELLES FONCTIONS HELPER (AJOUTÉES) ---------- */
// (La fonction showSnackbar existait déjà et est compatible)
const showSnackbar = (text: string, color: string) => {
  snackbar.value = { show: true, text, color }
}

function setLastError(err: unknown) {
  const info = getErrorInfo(err)
  lastError.value = info.message
  // console useful for debugging
  // eslint-disable-next-line no-console
  console.debug('ErrorInfo:', info)
}

/* ---------- 7. TOUTE LA LOGIQUE DU SCANNER (AJOUTÉE) ---------- */

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

async function startPreviewForDevice() {
  await stopPreview()
  loadingPermission.value = true
  try {
    const constraints: MediaStreamConstraints = { video: { facingMode: 'environment' } }
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
  permissionMessage.value = ''
  lastError.value = ''
  try {
    await startPreviewForDevice()
  } catch (_err) {
    return // Le message d'erreur est déjà défini
  }
  await nextTick()
  await startScanner()
}

const startScanner = async () => {
  if (scannerRunning.value) return
  if (!qrReaderEl.value) { permissionMessage.value = 'Container scanner introuvable'; return }
  try {
    const module = await import('html5-qrcode')
    const Html5Qrcode = (module as any).Html5Qrcode
    if (!Html5Qrcode) { permissionMessage.value = 'module html5-qrcode non trouvé'; return }

    try { await stopScanner() } catch (e) { /* ignore */ }

    if (!qrReaderEl.value.id) qrReaderEl.value.id = 'qr-reader'
    scannerInstance = new Html5Qrcode(qrReaderEl.value.id)
    const cameraConfig = { facingMode: "environment" }
    const config = { fps: 10, qrbox: 250 }

    await scannerInstance.start(
      cameraConfig,
      config,
      async (decodedText: string) => {
        qrUrl.value = decodedText
        showSnackbar('QR Code détecté !', 'success')
        if (autoSubmit.value) {
          try {
            await checkAttendance() // Appel de la fonction adaptée
          } catch (e) {
            // rien de spécial — checkAttendance gère ses propres erreurs
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


/* ---------- 8. FONCTION 'checkAttendance' (MISE À JOUR) ---------- */
const checkAttendance = async () => {
  if (!qrUrl.value || !user.value) return

  // 1. Vérifier que l'objet user a bien un 'id' numérique
  if (!user.value.id || typeof user.value.id !== 'number') {
    showSnackbar('ID de l\'utilisateur (numérique) non trouvé.', 'error')
    return
  }
  const studentId = user.value.id

  checkingAttendance.value = true
  try {
    // 2. Parser l'URL du QR code
    const url = new URL(qrUrl.value)
    const sessionIdStr = url.searchParams.get('session_id')
    const token = url.searchParams.get('token')

    if (!sessionIdStr || !token) {
      showSnackbar('QR Code invalide (session_id ou token manquant)', 'error')
      checkingAttendance.value = false
      return
    }

    // 3. ÉTAPE 1: Valider la session d'abord
    const validation = await AttendanceService.validateSession(sessionIdStr, token)

    // Si la session est invalide ou expirée
    if (!validation.valid || !validation.session) {
      showSnackbar(validation.error || 'Session invalide ou expirée', 'error')
      checkingAttendance.value = false
      return
    }

    // 4. ÉTAPE 2: Si valide, enregistrer la présence (avec les 2 arguments)
    // On utilise l'ID numérique de la session retourné par la validation
    const sessionIdNum = validation.session.id
    const response = await AttendanceService.recordAttendance(studentId, sessionIdNum);

    if (response.success) {
      showSnackbar('Présence enregistrée!', 'success')
      qrUrl.value = ''
      loadMyPresences() // Recharge l'historique
    } else {
      // Gère les erreurs spécifiques (ex: "déjà enregistré")
      showSnackbar(response.error || 'Erreur enregistrement', 'error')
    }

  } catch (err: unknown) {
    setLastError(err) // La fonction setLastError existe déjà
    const info = getErrorInfo(err)
    showSnackbar('Erreur: ' + info.message, 'error')
  } finally {
    checkingAttendance.value = false
  }
}


/* ---------- 9. CONTRÔLE DU DIALOG (AJOUTÉ) ---------- */
const openScannerDialog = async () => {
  scannerDialog.value = true
  await nextTick()
  if (qrReaderEl.value && !qrReaderEl.value.id) qrReaderEl.value.id = 'qr-reader'
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


/* ---------- FONCTIONS EXISTANTES (conservées) ---------- */

onMounted(async () => {
  const currentUser = await AuthService.getCurrentUser()
  if (!currentUser || currentUser.type !== 'student') {
    router.push('/login')
    return
  }
  user.value = currentUser
  await loadMyPresences()
})

// 10. HOOK DE CYCLE DE VIE (AJOUTÉ)
onBeforeUnmount(async () => {
  try { await stopScanner(); await stopPreview() } catch (_) {}
})

const loadMyPresences = async () => {
  if (!user.value) return

  loadingPresences.value = true
  try {
    const data = await AttendanceService.getStudentAttendance(user.value.id)
    myPresences.value = data
  } catch (error: any) {
    console.error('Erreur de chargement des présences:', error)
    showSnackbar('Erreur lors du chargement de l\'historique', 'error')
  } finally {
    loadingPresences.value = false
  }
}

const formatDateTime = (dateTime: string) => {
  return new Date(dateTime).toLocaleString('fr-FR')
}

const logout = () => {
  AuthService.logout()
  router.push('/login')
}
</script>

<style scoped>
.preview-wrap video { width:100%; height:100%; object-fit:cover; border-radius:6px; }
.qr-box { border-radius:6px; overflow:hidden; min-height:260px; background:#000; display:flex; align-items:center; justify-content:center; }
</style>
