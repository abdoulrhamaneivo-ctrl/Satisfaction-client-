
// This module imports all jobs and is imported by the server to ensure
// any schedules that are not referenced are still loaded by NodeJS.

import '../detecterAlertesSilence.js'
import '../relancerTachesEnRetard.js'
import '../envoyerRapportsMensuels.js'
import '../archiverElementsResolusAnciens.js'
import '../analyserAvisIAJob.js'
