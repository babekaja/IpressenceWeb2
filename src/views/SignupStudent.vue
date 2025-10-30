<template>
  <v-app>
    <v-main>
      <v-container fluid class="fill-height bg-grey-lighten-3">
        <v-row align="center" justify="center">
          <v-col cols="12" sm="10" md="8" lg="6">
            <v-card class="elevation-12 rounded-lg">
              <v-card-title class="text-center pa-6 bg-blue-darken-3">
                <div class="w-100">
                  <v-icon size="48" color="white" class="mb-2">mdi-account-plus</v-icon>
                  <h2 class="text-h5 text-white">Inscription Étudiant</h2>
                  <p class="text-subtitle-2 text-white opacity-75">Université Catholique de Bukavu</p>
                </div>
              </v-card-title>

              <v-card-text class="pa-6">
                <v-stepper v-model="step" :items="['Matricule', 'Informations', 'Confirmation']" show-actions>
                  <template v-slot:item.1>
                    <v-card flat>
                      <v-card-text>
                        <h3 class="text-h6 mb-4 text-blue-darken-3">Étape 1: Saisissez votre matricule</h3>

                        <v-text-field
                          v-model="matricule"
                          label="Matricule (ex: 05/23.08831)"
                          prepend-inner-icon="mdi-card-account-details"
                          variant="outlined"
                          :rules="[rules.required]"
                          :loading="loadingAkhademie"
                          :disabled="loadingAkhademie"
                          @keyup.enter="fetchAkhademieData"
                        ></v-text-field>

                        <v-alert v-if="akhademieError" type="error" class="mb-4" closable>
                          {{ akhademieError }}
                        </v-alert>

                        <v-btn
                          color="blue-darken-3"
                          size="large"
                          block
                          :disabled="!matricule"
                          @click="fetchAkhademieData"
                          :loading="loadingAkhademie"
                          class="mt-3"
                        >
                          <v-icon start>mdi-magnify</v-icon>
                          Rechercher
                        </v-btn>

                        <div class="text-center mt-4">
                          <v-btn variant="text" color="blue-darken-3" @click="router.push('/login')">
                            Déjà un compte ? Se connecter
                          </v-btn>
                        </div>
                      </v-card-text>
                    </v-card>
                  </template>

                  <template v-slot:item.2>
                    <v-card flat>
                      <v-card-text>
                        <h3 class="text-h6 mb-4 text-blue-darken-3">Étape 2: Vérifiez et complétez vos informations</h3>
                        <v-form ref="formRef" lazy-validation>
                            <v-row v-if="akhademieData">
                              <v-col cols="12" class="text-center mb-4">
                                <v-avatar size="100" color="grey-lighten-2">
                                  <v-img :src="formData.avatar || undefined" alt="Photo" cover>
                                    <template v-slot:placeholder>
                                      <v-icon size="50">mdi-account-circle</v-icon>
                                    </template>
                                  </v-img>
                                </v-avatar>
                              </v-col>

                              <v-col cols="12" md="6">
                                <v-text-field
                                  v-model="formData.nom"
                                  label="Nom(s)"
                                  variant="outlined"
                                  prepend-inner-icon="mdi-badge-account"
                                  :rules="[rules.required]"
                                ></v-text-field>
                              </v-col>

                              <v-col cols="12" md="6">
                                <v-text-field
                                  v-model="formData.prenom"
                                  label="Prénom"
                                  variant="outlined"
                                  prepend-inner-icon="mdi-account"
                                  :rules="[rules.required]"
                                ></v-text-field>
                              </v-col>

                              <v-col cols="12" md="6">
                                <v-text-field
                                  v-model="formData.email"
                                  label="Email (obligatoire)"
                                  type="email"
                                  variant="outlined"
                                  prepend-inner-icon="mdi-email"
                                  :rules="[rules.required, rules.email]"
                                ></v-text-field>
                              </v-col>

                              <v-col cols="12" md="6">
                                <v-text-field
                                  v-model="formData.telephone"
                                  label="Téléphone"
                                  variant="outlined"
                                  prepend-inner-icon="mdi-phone"
                                  :rules="[rules.required]"
                                ></v-text-field>
                              </v-col>

                              <v-col cols="12" md="6">
                                <v-text-field
                                  v-model="formData.filiere"
                                  label="Filière"
                                  variant="outlined"
                                  prepend-inner-icon="mdi-school"
                                  readonly
                                  color="success"
                                ></v-text-field>
                              </v-col>

                              <v-col cols="12" md="6">
                                <v-text-field
                                  v-model="formData.orientation"
                                  label="Orientation"
                                  variant="outlined"
                                  prepend-inner-icon="mdi-compass"
                                  readonly
                                  color="success"
                                ></v-text-field>
                              </v-col>

                              <!-- Champ 'gender' caché, il contient la valeur normalisée (M ou F) -->
                              <input type="hidden" v-model="formData.gender" />

                              <v-col cols="12" md="6">
                                <v-text-field
                                  v-model="formData.password"
                                  label="Mot de passe"
                                  type="password"
                                  variant="outlined"
                                  prepend-inner-icon="mdi-lock"
                                  :rules="[rules.required, rules.minLength]"
                                ></v-text-field>
                              </v-col>

                              <v-col cols="12" md="6">
                                <v-text-field
                                  v-model="confirmPassword"
                                  label="Confirmer le mot de passe"
                                  type="password"
                                  variant="outlined"
                                  prepend-inner-icon="mdi-lock-check"
                                  :rules="[rules.required, rules.passwordMatch]"
                                ></v-text-field>
                              </v-col>
                            </v-row>
                        </v-form>

                        <v-alert v-if="registrationError" type="error" class="mb-4 mt-4" closable>
                          {{ registrationError }}
                        </v-alert>

                        <div class="d-flex mt-4">
                          <v-btn @click="step = 1" variant="outlined" color="blue-darken-3">
                            <v-icon start>mdi-arrow-left</v-icon>
                            Retour
                          </v-btn>
                          <v-spacer></v-spacer>
                          <v-btn
                            color="blue-darken-3"
                            @click="submitRegistration"
                            :loading="submitting"
                            :disabled="!canSubmit"
                          >
                            <v-icon start>mdi-check</v-icon>
                            Créer mon compte
                          </v-btn>
                        </div>
                      </v-card-text>
                    </v-card>
                  </template>

                  <template v-slot:item.3>
                    <v-card flat>
                      <v-card-text class="text-center py-8">
                        <v-icon size="100" color="success" class="mb-4">mdi-check-circle</v-icon>
                        <h3 class="text-h5 mb-4 text-success">Compte créé avec succès!</h3>
                        <p class="mb-6 text-medium-emphasis">Votre compte a été créé. Vous pouvez maintenant vous connecter.</p>

                        <v-btn color="blue-darken-3" size="large" @click="completeRegistration">
                          <v-icon start>mdi-login</v-icon>
                          Se connecter
                        </v-btn>
                      </v-card-text>
                    </v-card>
                  </template>
                </v-stepper>
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>
      </v-container>
    </v-main>
  </v-app>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import axios from 'axios'
import AuthService from '../services/auth.service' // Assuming this service exists

// --- Initialisation et États ---
const router = useRouter()
const formRef = ref<any>(null)

const step = ref(1)
const matricule = ref('05/23.08831') // Pré-remplissage pour test
const loadingAkhademie = ref(false)
const akhademieError = ref('')
const akhademieData = ref<any>(null)

const submitting = ref(false)
const registrationError = ref('')
const confirmPassword = ref('')

const formData = ref({
  nom: '',
  prenom: '',
  email: '',
  telephone: '',
  password: '',
  filiere: '',
  orientation: '',
  avatar: '',
  gender: '' // --- CORRECTION ---: Ajout du champ pour stocker le genre normalisé
})

// --- Règles de Validation ---
const rules = {
  required: (v: string) => !!v || 'Ce champ est requis',
  minLength: (v: string) => v.length >= 6 || 'Minimum 6 caractères',
  email: (v: string) => /.+@.+\..+/.test(v) || 'L\'E-mail doit être valide',
  passwordMatch: (v: string) => v === formData.value.password || 'Les mots de passe ne correspondent pas'
}

// --- Propriétés Calculées ---
const canSubmit = computed(() => {
  return formData.value.nom &&
    formData.value.prenom &&
    formData.value.email &&
    formData.value.telephone &&
    formData.value.password &&
    formData.value.password.length >= 6 &&
    confirmPassword.value === formData.value.password
})

// --- Fonctions ---

// --- CORRECTION ---: Ajout d'une fonction pour normaliser le genre
/**
 * Transforme "Masculin" en "M" et "Féminin" en "F".
 * @param genderString Le genre tel que reçu de l'API Akhademie
 */
const normalizeGender = (genderString: string | null | undefined): string => {
  if (!genderString) return '';
  const lowerGender = genderString.toLowerCase();
  
  if (lowerGender.startsWith('m') || lowerGender === 'masculin') return 'M';
  if (lowerGender.startsWith('f') || lowerGender === 'féminin') return 'F';
  
  // Retourne le premier caractère si inconnu, ou une chaîne vide
  return genderString.charAt(0).toUpperCase() || '';
}

/**
 * Récupère les données de l'étudiant via l'API Akhademie.
 */
const fetchAkhademieData = async () => {
  if (!matricule.value) return

  loadingAkhademie.value = true
  akhademieError.value = ''
  akhademieData.value = null

  try {
    const response = await axios.get(
      `https://akhademie.ucbukavu.ac.cd/api/v1/school-students/read-by-matricule?matricule=${encodeURIComponent(matricule.value)}`
    )

    const studentData = response.data.data

    if (studentData) {
      akhademieData.value = studentData 

      formData.value.nom = studentData.noms || studentData.fullname || ''
      formData.value.prenom = studentData.firstname || ''
      formData.value.email = studentData.email || ''
      formData.value.telephone = studentData.phoneNumber || ''

      formData.value.filiere = studentData.schoolFilieres?.shortName || ''
      formData.value.orientation = studentData.schoolOrientations?.title || ''
      formData.value.avatar = studentData.avatar || ''
      
      // --- CORRECTION ---: Normaliser le genre dès la récupération
      // On vérifie les noms de champs possibles 'gender' ou 'sexe'
      formData.value.gender = normalizeGender(studentData.gender || studentData.sexe);

      step.value = 2
    } else {
      akhademieError.value = response.data.message || 'Aucune donnée trouvée pour ce matricule.'
    }
  } catch (error: any) {
    console.error("Erreur API Akhademie:", error);
    if (error.response && error.response.status === 404) {
        akhademieError.value = `Le matricule ${matricule.value} n'a pas été trouvé.`;
    } else {
        akhademieError.value = 'Erreur lors de la récupération des données. Vérifiez le matricule et votre connexion.';
    }
  } finally {
    loadingAkhademie.value = false
  }
}

/**
 * Soumet les données pour l'inscription.
 */
const submitRegistration = async () => {
  const { valid } = await formRef.value.validate()
  if (!valid || !canSubmit.value) return

  submitting.value = true
  registrationError.value = ''

  // --- CORRECTION ---:
  // Modifie l'objet akhademieData *avant* de l'envoyer
  // pour que le champ 'gender' soit correct.
  if (akhademieData.value) {
    // On s'assure que le champ 'gender' (ou 'sexe') dans l'objet
    // qui sera envoyé au backend contient la valeur normalisée (M/F).
    akhademieData.value.gender = formData.value.gender;
    
    // Si l'API Akhademie utilise 'sexe', on met à jour 'sexe' aussi
    if ('sexe' in akhademieData.value) {
         akhademieData.value.sexe = formData.value.gender;
    }
  }

  try {
    const result = await AuthService.registerStudent({
      matricule: matricule.value,
      nom: formData.value.nom,
      prenom: formData.value.prenom,
      email: formData.value.email,
      telephone: formData.value.telephone,
      password: formData.value.password,
      // On envoie l'objet 'akhademie_data' maintenant corrigé
      akhademie_data: akhademieData.value 
    })

    if (result.success) {
      step.value = 3
    } else {
      registrationError.value = result.error || 'Erreur lors de l\'inscription.'
    }
  } catch (error: any) {
    console.error("Erreur d'inscription:", error);
    // Affiche l'erreur spécifique de la BDD si elle remonte
    const serverMessage = error.response?.data?.message || error.message || 'Problème réseau/serveur.';
    registrationError.value = 'Erreur: Impossible de créer le compte. ' + serverMessage;
  } finally {
    submitting.value = false
  }
}

/**
 * Termine l'inscription et redirige.
 */
const completeRegistration = () => {
  const pendingScan = localStorage.getItem('pending_scan')

  if (pendingScan) {
    const scanData = JSON.parse(pendingScan)
    router.push(`/scan?session_id=${scanData.session_id}&token=${scanData.token}`)
  } else {
    router.push('/login')
  }
}
</script>

<style scoped>
/* Ajout d'un style plus moderne pour le stepper */
.v-stepper {
  border-radius: 8px;
  background: white;
}
/* Aligner les boutons Retour/Créer mon compte */
.d-flex {
  display: flex;
}
</style>
