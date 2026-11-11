import { useState, useEffect, useRef } from 'react'
import {
  produits,
  supplementsSweet,
  supplementsSavoury,
} from './data/menu'
import './App.css'
import Admin from './components/Admin'
import Cuisine from './components/Cuisine'
import PersonnaliserProduits from './components/PersonnaliserProduits'
import { supabase } from './supabase'

const couleursCrepes = [
  {
    nom: 'Rose pastel',
    valeur: '#F6D6DC',
  },
  {
    nom: 'Marron clair',
    valeur: '#D9B38C',
  },
  {
    nom: 'Marron',
    valeur: '#B9825B',
  },
  {
    nom: 'Jaune pastel',
    valeur: '#F6E7A8',
  },
  {
    nom: 'Orange pastel',
    valeur: '#F6C79C',
  },
  {
    nom: 'Blanc',
    valeur: '#FFFFFF',
  },
  {
    nom: 'Gris',
    valeur: '#D9D9D9',
  },
  {
    nom: 'Marron orange',
    valeur: '#C98F62',
  },
  {
    nom: 'Vert',
    valeur: '#b6d3b2',
  },
]
function App() {
  console.log('APP.jsx CHARGÉ')

const actionsPanierRef = useRef(null)
const finPanierRef = useRef(null)
const zoneCommandeRef = useRef(null)
const [hauteurActionsPanier, setHauteurActionsPanier] = useState(0)
const [largeurZoneCommande, setLargeurZoneCommande] = useState(0)
const [gaucheZoneCommande, setGaucheZoneCommande] = useState(0)
const [vueHoraireActive, setVueHoraireActive] = useState(0)
const [recapVisible, setRecapVisible] = useState(false)
console.log('Récapitulatif visible :', recapVisible)


useEffect(() => {
  const mesurerPanier = () => {
    const zone = zoneCommandeRef.current
    const barre = actionsPanierRef.current

    if (zone) {
      const position = zone.getBoundingClientRect()
      setLargeurZoneCommande(position.width)
      setGaucheZoneCommande(position.left)
    }

    if (barre) {
      setHauteurActionsPanier(barre.offsetHeight)
    }
  }

  mesurerPanier()

  const observer = new ResizeObserver(mesurerPanier)

  if (zoneCommandeRef.current) {
    observer.observe(zoneCommandeRef.current)
  }

  if (actionsPanierRef.current) {
    observer.observe(actionsPanierRef.current)
  }

  window.addEventListener('resize', mesurerPanier)

  return () => {
    observer.disconnect()
    window.removeEventListener('resize', mesurerPanier)
  }
}, [])

const paiementEnCours = useRef(false)
const [paiementEnregistrement, setPaiementEnregistrement] = useState(false)
const clePaiementActuelle = useRef(null)

const [session, setSession] = useState(null)
const [chargementSession, setChargementSession] = useState(true)
const [emailConnexion, setEmailConnexion] = useState('')
const [motDePasseConnexion, setMotDePasseConnexion] = useState('')

useEffect(() => {
  const chargerSession = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession()

    setSession(session)
    setChargementSession(false)
  }

  chargerSession()

  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange(
    (_event, session) => {
      setSession(session)
    }
  )

  return () => {
    subscription.unsubscribe()
  }
}, [])

useEffect(() => {
  const chargerHistorique = async () => {
    const { data: evenements, error } = await supabase
      .from('evenements')
      .select('*')
      .eq('statut', 'Terminé')
      .order('date', { ascending: false })

    if (error) {
      console.error(
        'Erreur lors du chargement de l’historique :',
        error
      )
      return
    }

    const { data: commandes, error: erreurCommandes } =
  await supabase
    .from('commandes')
    .select('*')
    .order('numero', { ascending: true })

    if (erreurCommandes) {
      console.error(
        'Erreur lors du chargement des commandes de l’historique :',
        erreurCommandes
      )
      return
    }


const historique = (evenements || []).map(
  (evenement) => ({
    ...evenement,
    commandes: (commandes || [])
  .filter(
    (commande) =>
      String(commande.evenement_id) ===
      String(evenement.id)
  )
  .sort(
    (a, b) => Number(a.numero) - Number(b.numero)
  )
  .map((commande) => ({
  id: commande.id,
  evenementId: commande.evenement_id,
  numero: commande.numero,
  numeroTicket: commande.numero_ticket,
  created_at: commande.created_at,
  articles: commande.articles,
  total: commande.total,
  modePaiement: commande.mode_paiement,
  montantEspeces: commande.montant_especes,
  montantCarte: commande.montant_carte,
  statut: commande.statut,
})),
  })
)


    setHistoriqueEvenements(historique)

    console.log(
      'Historique chargé depuis Supabase :',
      historique
    )
  }

if (session) {
  chargerHistorique()
}
}, [session])
useEffect(() => {
  const canalEvenements = supabase
    .channel('evenements-en-temps-reel-v2')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'evenements',
      },
      (payload) => {
        console.log(
          'REALTIME EVENEMENT INSERT :',
          payload
        )

        const evenementRealtime = {
          id: payload.new.id,
          nom: payload.new.nom,
          date: payload.new.date,
          template: payload.new.template,
          statut: payload.new.statut,
        }

        if (evenementRealtime.statut !== 'En cours') {
          return
        }

        setEvenementsActifs((anciensEvenements) => {
          const existe = anciensEvenements.some(
            (ancienEvenement) =>
              ancienEvenement.id === evenementRealtime.id
          )

          if (existe) {
            return anciensEvenements
          }

          return [
            ...anciensEvenements,
            evenementRealtime,
          ]
        })
      }
    )
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'evenements',
      },
      (payload) => {
        console.log(
          'REALTIME EVENEMENT UPDATE :',
          payload
        )

        const evenementRealtime = {
          id: payload.new.id,
          nom: payload.new.nom,
          date: payload.new.date,
          template: payload.new.template,
          statut: payload.new.statut,
        }

        if (evenementRealtime.statut === 'Terminé') {
          if (evenement?.id === evenementRealtime.id) {
            setEvenement(null)
            setAccueil(true)
            setCreationEvenement(false)
          }

          const chargerCommandesEvenementTermine =
            async () => {
              const { data, error } = await supabase
                .from('commandes')
                .select('*')
                .eq(
                  'evenement_id',
                  evenementRealtime.id
                )

              if (error) {
                console.error(
                  'Erreur lors du chargement des commandes de l’événement terminé :',
                  error
                )
                return
              }

              
const commandesEvenement =
  (data || [])
    .sort(
      (a, b) => Number(a.numero) - Number(b.numero)
    )
    .map((commande) => ({
  id: commande.id,
  evenementId: commande.evenement_id,
  numero: commande.numero,
  numeroTicket: commande.numero_ticket,
  created_at: commande.created_at,
  articles: commande.articles,
  total: commande.total,
  modePaiement: commande.mode_paiement,
  montantEspeces: commande.montant_especes,
  montantCarte: commande.montant_carte,
  statut: commande.statut,
}))


              setHistoriqueEvenements(
                (anciensEvenements) => {
                  const existe =
                    anciensEvenements.some(
                      (ancienEvenement) =>
                        ancienEvenement.id ===
                        evenementRealtime.id
                    )

                  if (existe) {
                    return anciensEvenements.map(
                      (ancienEvenement) =>
                        ancienEvenement.id ===
                        evenementRealtime.id
                          ? {
                              ...ancienEvenement,
                              commandes:
                                commandesEvenement,
                            }
                          : ancienEvenement
                    )
                  }

                  return [
                    ...anciensEvenements,
                    {
                      ...evenementRealtime,
                      commandes:
                        commandesEvenement,
                    },
                  ]
                }
              )
            }

          chargerCommandesEvenementTermine()

          setEvenementsActifs(
            (anciensEvenements) =>
              anciensEvenements.filter(
                (ancienEvenement) =>
                  ancienEvenement.id !==
                  evenementRealtime.id
              )
          )

          return
        }

        setEvenementsActifs(
          (anciensEvenements) =>
            anciensEvenements.map(
              (ancienEvenement) =>
                ancienEvenement.id ===
                evenementRealtime.id
                  ? evenementRealtime
                  : ancienEvenement
            )
        )
      }
    )
    .on(
      'postgres_changes',
      {
        event: 'DELETE',
        schema: 'public',
        table: 'evenements',
      },
(payload) => {
  console.log(
    'REALTIME EVENEMENT DELETE :',
    payload
  )

  setEvenementsActifs(
    (anciensEvenements) =>
      anciensEvenements.filter(
        (ancienEvenement) =>
          ancienEvenement.id !==
          payload.old.id
      )
  )
  setHistoriqueEvenements(
    (anciensEvenements) =>
      anciensEvenements.filter(
        (ancienEvenement) =>
          ancienEvenement.id !==
          payload.old.id
      )
  )
}
    )
    .subscribe((status) => {
      console.log(
        'STATUT REALTIME EVENEMENTS V2 :',
        status
      )
    })

  return () => {
    supabase.removeChannel(canalEvenements)
  }
}, [])

useEffect(() => {
  const chargerCommandes = async () => {
    const { data, error } = await supabase
  .from('commandes')
  .select('*')
  .order('numero', { ascending: true })

    if (error) {
      console.error(
        'Erreur lors du chargement des commandes :',
        error
      )
      return
    }

    const commandesSupabase = (data || []).map(
  (commande) => ({
    id: commande.id,
    evenementId: commande.evenement_id,
    numero: commande.numero,
    numeroTicket: commande.numero_ticket,
    created_at: commande.created_at,
    articles: commande.articles,
    total: commande.total,
    modePaiement: commande.mode_paiement,
    montantEspeces: commande.montant_especes,
    montantCarte: commande.montant_carte,
    statut: commande.statut,
  })
)

setCommandes(
  commandesSupabase.sort(
    (a, b) => Number(a.numero) - Number(b.numero)
  )
)

    console.log(
      'Commandes chargées depuis Supabase :',
      commandesSupabase
    )
  }

  if (session) {
    chargerCommandes()
  }
}, [session])

useEffect(() => {
  const canalCommandes = supabase
    .channel('commandes-en-temps-reel')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'commandes',
      },
      (payload) => {
        const commande = payload.new


        
const nouvelleCommande = {
  id: commande.id,
  evenementId: commande.evenement_id,
  numero: commande.numero,
  numeroTicket: commande.numero_ticket,
  created_at: commande.created_at,
  articles: commande.articles,
  total: commande.total,
  modePaiement: commande.mode_paiement,
  montantEspeces: commande.montant_especes,
  montantCarte: commande.montant_carte,
  statut: commande.statut,
}

        

        setCommandes((anciennesCommandes) => {

          // Nouvelle commande
          if (payload.eventType === 'INSERT') {
            const existe = anciennesCommandes.some(
              (ancienneCommande) =>
                ancienneCommande.id ===
                nouvelleCommande.id
            )

            if (existe) {
              return anciennesCommandes
            }

            return [
              ...anciennesCommandes,
              nouvelleCommande,
            ]
          }

          // Commande modifiée
          if (payload.eventType === 'UPDATE') {
            return anciennesCommandes.map(
              (ancienneCommande) =>
                String(ancienneCommande.id) ===
                String(nouvelleCommande.id)
                  ? nouvelleCommande
                  : ancienneCommande
            )
          }

          // Commande supprimée
          if (payload.eventType === 'DELETE') {
            return anciennesCommandes.filter(
              (ancienneCommande) =>
                String(ancienneCommande.id) !==
                String(payload.old.id)
            )
          }

          return anciennesCommandes
        })
      }
    )
    .subscribe((status) => {
  console.log(
    'STATUT REALTIME COMMANDES :',
    status
  )
})

  return () => {
    supabase.removeChannel(canalCommandes)
  }
}, [])

useEffect(() => {
  const chargerSupplements = async () => {
    const { data, error } = await supabase
      .from('supplements')
      .select('*')
      .order('id', { ascending: true })

    if (error) {
      console.error(
        'Erreur lors du chargement des suppléments :',
        error
      )
      return
    }

    const supplementsSupabase = (data || []).map(
      (supplement) => ({
        id: supplement.id,
        nom: supplement.nom,
        prix: supplement.prix,
        categorie: supplement.categorie,
      })
    )

    setSupplements({
      Sweet: supplementsSupabase.filter(
        (supplement) =>
          supplement.categorie === 'Sweet'
      ),
      Savoury: supplementsSupabase.filter(
        (supplement) =>
          supplement.categorie === 'Savoury'
      ),
    })

    console.log(
      'Suppléments chargés depuis Supabase :',
      supplementsSupabase
    )
  }

  if (session) {
    chargerSupplements()
  }
}, [session])

useEffect(() => {
  const canalSupplements = supabase
    .channel('supplements-en-temps-reel')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'supplements',
      },
      (payload) => {
       const supplement =
  payload.eventType === 'DELETE'
    ? payload.old
    : payload.new

const supplementRealtime = {
  id: supplement.id,
  nom: supplement.nom,
  prix: supplement.prix,
  categorie: supplement.categorie,
}

        setSupplements((anciensSupplements) => {
          if (payload.eventType === 'INSERT') {
            const existe = anciensSupplements[
              supplementRealtime.categorie
            ]?.some(
              (ancienSupplement) =>
                ancienSupplement.id ===
                supplementRealtime.id
            )

            if (existe) {
              return anciensSupplements
            }

            return {
              ...anciensSupplements,
              [supplementRealtime.categorie]: [
                ...(anciensSupplements[
                  supplementRealtime.categorie
                ] || []),
                supplementRealtime,
              ],
            }
          }

          if (payload.eventType === 'UPDATE') {
            return {
              ...anciensSupplements,
              [supplementRealtime.categorie]: (
                anciensSupplements[
                  supplementRealtime.categorie
                ] || []
              ).map((ancienSupplement) =>
                ancienSupplement.id ===
                supplementRealtime.id
                  ? supplementRealtime
                  : ancienSupplement
              ),
            }
          }

          if (payload.eventType === 'DELETE') {
            return {
              ...anciensSupplements,
              Sweet: anciensSupplements.Sweet.filter(
                (supplement) =>
                  supplement.id !==
                  supplementRealtime.id
              ),
              Savoury: anciensSupplements.Savoury.filter(
                (supplement) =>
                  supplement.id !==
                  supplementRealtime.id
              ),
            }
          }

          return anciensSupplements
        })
      }
    )
    .subscribe((status) => {
  console.log(
    'STATUT REALTIME SUPPLEMENTS :',
    status
  )
})

  return () => {
    supabase.removeChannel(canalSupplements)
  }
}, [])
  const [commande, setCommande] = useState([])
  const [commandesEnCours, setCommandesEnCours] =
  useState({})
  const [creationEnCours, setCreationEnCours] =
  useState(false)
const [commandes, setCommandes] = useState([])
const [commandeEnModification, setCommandeEnModification] =
  useState(null)
const [articlesEnModification, setArticlesEnModification] =
  useState([])
const [prochainTicket, setProchainTicket] = useState(null)
const [historiqueEvenements, setHistoriqueEvenements] =
  useState([])
const [evenement, setEvenement] = useState(null)
const [chargementEvenements, setChargementEvenements] = useState(true)

  useEffect(() => {
  if (!session) {
    return
  }

  const chargerEvenements = async () => {
    const { data, error } = await supabase
      .from('evenements')
      .select('*')
      .eq('statut', 'En cours')
      .order('date', { ascending: false })
console.log('RÉSULTAT CHARGEMENT ÉVÉNEMENTS :', {
  data,
  error,
})
    if (error) {
      console.error(
        'Erreur lors du chargement des événements :',
        error
      )
      setChargementEvenements(false)
      return
    }

    setEvenementsActifs(data || [])
    if (!data || data.length === 0) {
  setAccueil(true)
  setCreationEvenement(true)
}

    if (data && data.length > 0) {
      const evenementSauvegarde = data.find(
        (evenementActif) =>
          String(evenementActif.id) ===
          String(evenementSelectionneId)
      )

      if (evenementSauvegarde) {
  setEvenement(evenementSauvegarde)
} else {
  setEvenement(data[0])
}

const pageSauvegardee =
  localStorage.getItem('pageActuelle')
if (pageSauvegardee === 'analyse') {
  setAnalyse(true)
} else {
  setAnalyse(false)
}
if (
  pageSauvegardee === 'evenements-en-cours' ||
  pageSauvegardee === 'nouvel-evenement'
) {
  setAccueil(true)
  setCreationEvenement(
    pageSauvegardee === 'nouvel-evenement'
  )
} else {
  setAccueil(false)
  setCreationEvenement(false)
}

      console.log(
        'Événements chargés depuis Supabase :',
        data
      )
    }

    setChargementEvenements(false)
  }

  chargerEvenements()
}, [session])

const [connexionEnCours, setConnexionEnCours] =
  useState(false)
const [erreurConnexion, setErreurConnexion] =
  useState('')
const [evenementSelectionneId, setEvenementSelectionneId] =
  useState(() => {
    return localStorage.getItem('evenementSelectionneId')
  })

const [evenementsActifs, setEvenementsActifs] = useState([])
useEffect(() => {
  console.log(
    'Événements actifs :',
    evenementsActifs
  )
}, [evenementsActifs])

useEffect(() => {
  if (
    evenement &&
    evenementsActifs.length === 0
  ) {
    setEvenementsActifs([evenement])
  }
}, [evenement, evenementsActifs])
const [creationEvenement, setCreationEvenement] = useState(false)
const [nomEvenement, setNomEvenement] = useState('')
const obtenirDateDuJour = () =>
  new Date().toISOString().split('T')[0]

const [dateEvenement, setDateEvenement] = useState(
  obtenirDateDuJour()
)
const [templateEvenement, setTemplateEvenement] =
  useState('evenement')
const pageSauvegardee =
  localStorage.getItem('pageActuelle') || 'evenements-en-cours'
const [admin, setAdmin] = useState(
  pageSauvegardee === 'admin'
)

const [cuisine, setCuisine] = useState(
  pageSauvegardee === 'cuisine'
)

const [historique, setHistorique] = useState(
  pageSauvegardee === 'historique'
)
const [analyse, setAnalyse] = useState(
  localStorage.getItem('pageActuelle') === 'analyse'
)
const [periodeAnalyse, setPeriodeAnalyse] = useState('semaine')
useEffect(() => {
  if (!analyse) return

  const chargerCommandesAnalyse = async () => {
    const { data, error } = await supabase
      .from('commandes')
      .select('*')
      .order('created_at', { ascending: true })

    if (error) {
      console.error(
        'Erreur lors du chargement des commandes pour l’analyse :',
        error
      )
      return
    }

    setCommandesAnalyse(data || [])
    console.log('COMMANDES ANALYSE :', data)
    console.log('EXEMPLE COMMANDE :', data?.[0])
    console.log(
  'ARTICLES EXEMPLE :',
  JSON.stringify(data?.[0]?.articles, null, 2)
)
    console.log(
  'STATUTS DES COMMANDES :',
  [...new Set(data.map(commande => commande.statut))]
)
  }

  chargerCommandesAnalyse()
}, [analyse])
const [commandesAnalyse, setCommandesAnalyse] = useState([])
const commandesPayeesAnalyse = commandesAnalyse.filter(
  commande => commande.statut === 'Terminée'
)
const maintenantAnalyse = new Date()

const debutPeriodeAnalyse = new Date(maintenantAnalyse)

if (periodeAnalyse === 'semaine') {
  const jour = (maintenantAnalyse.getDay() + 6) % 7
  debutPeriodeAnalyse.setDate(
    maintenantAnalyse.getDate() - jour
  )
  debutPeriodeAnalyse.setHours(0, 0, 0, 0)

} else if (periodeAnalyse === 'mois') {
  debutPeriodeAnalyse.setDate(1)
  debutPeriodeAnalyse.setHours(0, 0, 0, 0)

} else if (periodeAnalyse === 'annee') {
  debutPeriodeAnalyse.setMonth(0, 1)
  debutPeriodeAnalyse.setHours(0, 0, 0, 0)
}
const debutPeriodePrecedenteAnalyse = new Date(
  debutPeriodeAnalyse
)

if (periodeAnalyse === 'semaine') {
  debutPeriodePrecedenteAnalyse.setDate(
    debutPeriodePrecedenteAnalyse.getDate() - 7
  )
} else if (periodeAnalyse === 'mois') {
  debutPeriodePrecedenteAnalyse.setMonth(
    debutPeriodePrecedenteAnalyse.getMonth() - 1
  )
} else if (periodeAnalyse === 'annee') {
  debutPeriodePrecedenteAnalyse.setFullYear(
    debutPeriodePrecedenteAnalyse.getFullYear() - 1
  )
}

const dureePeriodeEcouleeAnalyse =
  maintenantAnalyse.getTime() - debutPeriodeAnalyse.getTime()

const finPeriodePrecedenteAnalyse = new Date(
  debutPeriodePrecedenteAnalyse.getTime() +
  dureePeriodeEcouleeAnalyse
)
const commandesPeriodeAnalyse = commandesPayeesAnalyse.filter(
  commande => {
    const dateCommande = new Date(commande.created_at)

    return (
      dateCommande >= debutPeriodeAnalyse &&
      dateCommande <= maintenantAnalyse
    )
  }
)
const commandesPeriodePrecedenteAnalyse =
  commandesPayeesAnalyse.filter(commande => {
    const dateCommande = new Date(commande.created_at)

    return (
      dateCommande >= debutPeriodePrecedenteAnalyse &&
      dateCommande < finPeriodePrecedenteAnalyse
    )
  })
const chiffreAffairesPrecedentAnalyse =
  commandesPeriodePrecedenteAnalyse.reduce(
    (total, commande) =>
      total + Number(commande.total || 0),
    0
  )

const nombreCommandesPrecedentAnalyse =
  commandesPeriodePrecedenteAnalyse.length

const panierMoyenPrecedentAnalyse =
  nombreCommandesPrecedentAnalyse > 0
    ? chiffreAffairesPrecedentAnalyse /
      nombreCommandesPrecedentAnalyse
    : 0

const commandesParJourAnalyse = (() => {
  const jours = {}

  commandesPeriodeAnalyse.forEach(commande => {
    const date = new Date(commande.created_at)

    const cle = [
      date.getFullYear(),
      String(date.getMonth() + 1).padStart(2, '0'),
      String(date.getDate()).padStart(2, '0'),
    ].join('-')

    if (!jours[cle]) {
      jours[cle] = {
        date: cle,
        nombreCommandes: 0,
        chiffreAffaires: 0,
      }
    }

    jours[cle].nombreCommandes += 1
    jours[cle].chiffreAffaires += Number(commande.total || 0)
  })

  return Object.values(jours).sort(
    (a, b) => a.date.localeCompare(b.date)
  )
})()
const panierMoyenParJourAnalyse = commandesParJourAnalyse.map(
  jour => ({
    ...jour,
    panierMoyen:
      jour.nombreCommandes > 0
        ? jour.chiffreAffaires / jour.nombreCommandes
        : 0,
  })
)
const graphiqueCAAnalyse = (() => {
  if (periodeAnalyse === 'semaine') {
    return Array.from({ length: 7 }, (_, index) => {
      const date = new Date(debutPeriodeAnalyse)
      date.setDate(date.getDate() + index)

      const cle = [
        date.getFullYear(),
        String(date.getMonth() + 1).padStart(2, '0'),
        String(date.getDate()).padStart(2, '0'),
      ].join('-')

      const jour = commandesParJourAnalyse.find(
        jour => jour.date === cle
      )

      return {
        periode: cle,
        chiffreAffaires: jour?.chiffreAffaires || 0,
      }
    })
  }

  if (periodeAnalyse === 'mois') {
    const semaines = {}
    const premierJour = new Date(debutPeriodeAnalyse)
    const nombreJours = maintenantAnalyse.getDate()

    for (let i = 0; i < nombreJours; i++) {
      const date = new Date(premierJour)
      date.setDate(premierJour.getDate() + i)

      const debutSemaine = new Date(date)
      debutSemaine.setDate(
        date.getDate() - ((date.getDay() + 6) % 7)
      )

      const cle = [
        debutSemaine.getFullYear(),
        String(debutSemaine.getMonth() + 1).padStart(2, '0'),
        String(debutSemaine.getDate()).padStart(2, '0'),
      ].join('-')

      if (!semaines[cle]) {
        semaines[cle] = {
          periode: cle,
          chiffreAffaires: 0,
        }
      }

      const jour = commandesParJourAnalyse.find(
        jour => jour.date === [
          date.getFullYear(),
          String(date.getMonth() + 1).padStart(2, '0'),
          String(date.getDate()).padStart(2, '0'),
        ].join('-')
      )

      semaines[cle].chiffreAffaires +=
        jour?.chiffreAffaires || 0
    }

    return Object.values(semaines)
  }

  if (periodeAnalyse === 'annee') {
    return Array.from({ length: 12 }, (_, index) => {
      const date = new Date(
        maintenantAnalyse.getFullYear(),
        index,
        1
      )

      const cle = `${date.getFullYear()}-${String(
        date.getMonth() + 1
      ).padStart(2, '0')}`

      const chiffreAffaires = commandesPeriodeAnalyse
        .filter(commande => {
          const dateCommande = new Date(commande.created_at)

          return (
            dateCommande.getFullYear() === date.getFullYear() &&
            dateCommande.getMonth() === date.getMonth()
          )
        })
        .reduce(
          (total, commande) =>
            total + Number(commande.total || 0),
          0
        )

      return {
        periode: cle,
        chiffreAffaires,
      }
    })
  }

  return []
})()

const graphiqueCAAfficheAnalyse = (() => {
  if (periodeAnalyse !== 'annee') return graphiqueCAAnalyse

  const premierMoisAvecVentes = graphiqueCAAnalyse.findIndex(
    jour => jour.chiffreAffaires > 0
  )

  return premierMoisAvecVentes === -1
    ? graphiqueCAAnalyse
    : graphiqueCAAnalyse.slice(premierMoisAvecVentes)
})()

const chiffreAffairesAnalyse = commandesPeriodeAnalyse.reduce(
  (total, commande) => total + Number(commande.total || 0),
  0
)
const nombreCommandesAnalyse = commandesPeriodeAnalyse.length
const panierMoyenAnalyse =
  nombreCommandesAnalyse > 0
    ? chiffreAffairesAnalyse / nombreCommandesAnalyse
    : 0
const quantiteProduitsAnalyse = commandesPeriodeAnalyse.reduce(
  (total, commande) => {
    return (
      total +
      (commande.articles || []).reduce(
        (sousTotal, article) =>
          sousTotal + Number(article.quantite || 0),
        0
      )
    )
  },
  0
)
const calculerEvolutionAnalyse = (actuel, precedent) => {
  if (precedent === 0) {
    return actuel > 0 ? 100 : 0
  }

  return ((actuel - precedent) / precedent) * 100
}

const evolutionCAAnalyse = calculerEvolutionAnalyse(
  chiffreAffairesAnalyse,
  chiffreAffairesPrecedentAnalyse
)

const evolutionCommandesAnalyse = calculerEvolutionAnalyse(
  nombreCommandesAnalyse,
  nombreCommandesPrecedentAnalyse
)

const evolutionPanierAnalyse = calculerEvolutionAnalyse(
  panierMoyenAnalyse,
  panierMoyenPrecedentAnalyse
)
const chiffreAffairesCarteAnalyse =
  commandesPeriodeAnalyse
    .filter(commande => commande.mode_paiement === 'Carte')
    .reduce(
      (total, commande) => total + Number(commande.total || 0),
      0
    )

const chiffreAffairesEspecesAnalyse =
  commandesPeriodeAnalyse
    .filter(commande => commande.mode_paiement === 'Espèces')
    .reduce(
      (total, commande) => total + Number(commande.total || 0),
      0
    )
const classementProduitsAnalyse = (() => {
  const produits = {}

  commandesPeriodeAnalyse.forEach(commande => {
    ;(commande.articles || []).forEach(article => {
      const nom = article.nom

      if (!produits[nom]) {
        produits[nom] = 0
      }

      produits[nom] += Number(article.quantite || 0)
    })
  })

  return Object.entries(produits)
    .map(([nom, quantite]) => ({ nom, quantite }))
    .sort((a, b) => b.quantite - a.quantite)
    .slice(0, 5)
})()
const [accueil, setAccueil] = useState(
  pageSauvegardee === 'historique' ||
  pageSauvegardee === 'nouvel-evenement' ||
  pageSauvegardee === 'evenements-en-cours'
)

const [historiqueCommandesActif, setHistoriqueCommandesActif] =
  useState(
    pageSauvegardee === 'commandes'
  )
  useEffect(() => {
  let page = 'caisse'

  if (admin) {
    page = 'admin'
  } else if (cuisine) {
    page = 'cuisine'
  } else if (historique) {
    page = 'historique'
  } else if (analyse) {
  page = 'analyse'
  } else if (historiqueCommandesActif) {
    page = 'commandes'
  } else if (accueil && creationEvenement) {
    page = 'nouvel-evenement'
  } else if (accueil) {
    page = 'evenements-en-cours'
  }

  localStorage.setItem('pageActuelle', page)
}, [
  admin,
  cuisine,
  historique,
  historiqueCommandesActif,
  accueil,
  creationEvenement,
])
useEffect(() => {
  console.log('EFFET TICKET DÉMARRÉ')
console.log('ÉVÉNEMENT POUR LE TICKET :', evenement)
  if (!evenement?.id) {
    setProchainTicket(null)
    return
  }

  let actif = true

  const chargerProchainTicket = async () => {
    const { data, error } = await supabase
      .from('compteurs_tickets')
      .select('dernier_ticket')
      .eq('evenement_id', evenement.id)
      .maybeSingle()

    if (error) {
      console.error(
        'Erreur lors du chargement du prochain ticket :',
        error
      )
      return
    }

    const dernierTicket = Number(data?.dernier_ticket ?? 0)
    const prochain = (dernierTicket % 20) + 1

    if (actif) {
      setProchainTicket(prochain)
    }
  }

  chargerProchainTicket()

  return () => {
    actif = false
  }
}, [evenement?.id])
const [paiement, setPaiement] = useState(false)
const [modePaiement, setModePaiement] = useState('')
const [montantRecu, setMontantRecu] = useState('')
const [completerEnCarte, setCompleterEnCarte] = useState(false)
const [produitPersonnalise, setProduitPersonnalise] = useState(null)
const [rechercheHistorique, setRechercheHistorique] = useState('')
const [dateRechercheHistorique, setDateRechercheHistorique] = useState('')
const [evenementSelectionne, setEvenementSelectionne] = useState(null)
const [vueHistorique, setVueHistorique] = useState('statistiques')

const [menu, setMenu] = useState([])

const [supplements, setSupplements] = useState({
  Sweet: [],
  Savoury: [],
})
  const [categorie, setCategorie] = useState('Sweet')

useEffect(() => {
  const chargerProduits = async () => {
    const { data, error } = await supabase
      .from('produits')
      .select('*')
      .order('id', { ascending: true })

    if (error) {
      console.error(
        'Erreur lors du chargement des produits :',
        error
      )
      return
    }


const produitsSupabase = (data || []).map(
  (produit) => ({
    id: produit.id,
    nom: produit.nom,
    prixMarche: produit.prixMarche,
    prixEvenement: produit.prixEvenement,
    categorie: produit.categorie,
    typeRecette: produit.typeRecette,
    ingredients: produit.ingredients,
    couleur: produit.couleur,
    ordre: produit.ordre,
    visible: produit.visible ?? true,
  })
)

setMenu(produitsSupabase)


    console.log(
      'Produits chargés depuis Supabase :',
      produitsSupabase
    )
  }

  if (session) {
    chargerProduits()
  }
}, [session])
useEffect(() => {
  const canalProduits = supabase
    .channel('produits-en-temps-reel')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'produits',
      },
      (payload) => {
        const produit =
  payload.eventType === 'DELETE'
    ? payload.old
    : payload.new

        
const produitRealtime = {
  id: produit.id,
  nom: produit.nom,
  prixMarche: produit.prixMarche,
  prixEvenement: produit.prixEvenement,
  categorie: produit.categorie,
  typeRecette: produit.typeRecette,
  ingredients: produit.ingredients,
  couleur: produit.couleur,
  ordre: produit.ordre,
  visible: produit.visible ?? true,
}


        setMenu((ancienMenu) => {
          if (payload.eventType === 'INSERT') {
            const existe = ancienMenu.some(
              (ancienProduit) =>
                ancienProduit.id === produitRealtime.id
            )

            if (existe) {
              return ancienMenu
            }

            return [
              ...ancienMenu,
              produitRealtime,
            ]
          }

          if (payload.eventType === 'UPDATE') {
            return ancienMenu.map(
              (ancienProduit) =>
                ancienProduit.id === produitRealtime.id
                  ? produitRealtime
                  : ancienProduit
            )
          }

          if (payload.eventType === 'DELETE') {
            return ancienMenu.filter(
              (ancienProduit) =>
                ancienProduit.id !== produitRealtime.id
            )
          }

          return ancienMenu
        })
      }
    )
    .subscribe()

  return () => {
    supabase.removeChannel(canalProduits)
  }
}, [])
const [typeRecette, setTypeRecette] = useState('vege')
const seConnecter = async (e) => {
  e.preventDefault()

  setErreurConnexion('')
  setConnexionEnCours(true)

  const { data, error } =
    await supabase.auth.signInWithPassword({
      email: emailConnexion,
      password: motDePasseConnexion,
    })

  if (error) {
    console.error(
      'Erreur de connexion :',
      error
    )

    setErreurConnexion(
      'Email ou mot de passe incorrect.'
    )

    setConnexionEnCours(false)
    return
  }

  setSession(data.session)
  setConnexionEnCours(false)
}
const seDeconnecter = async () => {
  const { error } = await supabase.auth.signOut()

  if (error) {
    console.error(
      'Erreur lors de la déconnexion :',
      error
    )
    return
  }

  setSession(null)
}
const allerAccueil = () => {
  setAccueil(true)
  setAdmin(false)
  setCuisine(false)
  setHistorique(false)
  setCreationEvenement(false)
}
const creerEvenement = async (e) => {
  e.preventDefault()

  if (creationEnCours) {
    return
  }

  if (!nomEvenement || !dateEvenement) {
    return
  }

  setCreationEnCours(true)

  const { data, error } = await supabase
    .from('evenements')
    .insert({
  nom: nomEvenement,
  date: dateEvenement,
  template: templateEvenement,
  statut: 'En cours',
})
    .select()
    .single()

if (error) {
  console.error(
    'Erreur lors de la création de l’événement :',
    error
  )

  setCreationEnCours(false)

  return
}

  const nouvelEvenement = {
    id: data.id,
    nom: data.nom,
    date: data.date,
    template: data.template,
  }

  setEvenementsActifs((anciensEvenements) => [
    ...anciensEvenements,
    nouvelEvenement,
  ])

  setEvenement(nouvelEvenement)
  localStorage.setItem(
  'evenementSelectionneId',
  nouvelEvenement.id
)

  setAccueil(false)

  setNomEvenement('')
  setDateEvenement(obtenirDateDuJour())
  setTemplateEvenement('evenement')
  setCreationEnCours(false)
}

  // =========================
  // ADMINISTRATION
  // =========================

const ajouterNouveauProduit = async (nouveauProduit) => {
  const { data, error } = await supabase
    .from('produits')
    .insert({
  id: nouveauProduit.id,
  nom: nouveauProduit.nom,
  prixMarche: nouveauProduit.prixMarche,
  prixEvenement: nouveauProduit.prixEvenement,
  categorie: nouveauProduit.categorie,
  typeRecette: nouveauProduit.typeRecette,
  ingredients: nouveauProduit.ingredients,
couleur: nouveauProduit.couleur,

})
    .select()
    .single()

  if (error) {
    console.error(
      'Erreur lors de l’ajout du produit :',
      error
    )
    return
  }

  const produitAjoute = {
    ...nouveauProduit,
    id: data.id,
  }

  setMenu((ancienMenu) => [
    ...ancienMenu,
    produitAjoute,
  ])
}
const reordonnerProduits = async (nouveauxProduits) => {
  const produitsAvecOrdre = nouveauxProduits.map(
    (produit, index) => ({
      ...produit,
      ordre: index,
    })
  )

setMenu((ancienMenu) => {
  const menuMisAJour = ancienMenu.map((produit) => {
    const produitReordonne = produitsAvecOrdre.find(
      (p) => p.id === produit.id
    )

    return produitReordonne || produit
  })

  return menuMisAJour.sort(
    (a, b) =>
      (a.ordre ?? 9999) -
      (b.ordre ?? 9999)
  )
})

  for (const produit of produitsAvecOrdre) {
    await supabase
      .from('produits')
      .update({
        ordre: produit.ordre,
      })
      .eq('id', produit.id)
  }
}

const basculerVisibiliteProduit = async (produit) => {
  const produitActuel = menu.find(
    (p) => p.id === produit.id
  )

  if (!produitActuel) return

  const nouvelleVisibilite =
    produitActuel.visible === false

  const { error } = await supabase
    .from('produits')
    .update({ visible: nouvelleVisibilite })
    .eq('id', produit.id)

  if (error) {
    console.error(
      'Erreur de visibilité :',
      error
    )
    alert('Impossible de modifier la visibilité du produit.')
    return
  }

  setMenu((ancienMenu) =>
    ancienMenu.map((p) =>
      p.id === produit.id
        ? { ...p, visible: nouvelleVisibilite }
        : p
    )
  )
}

const modifierProduit = async (produitModifie) => {
  console.log(
  'COULEUR ENVOYÉE À SUPABASE :',
  produitModifie.couleur
)
  const { data, error } = await supabase
    .from('produits')
    .update({
      nom: produitModifie.nom,
      prixMarche: produitModifie.prixMarche,
      prixEvenement: produitModifie.prixEvenement,
      categorie: produitModifie.categorie,
      typeRecette: produitModifie.typeRecette,
      ingredients: produitModifie.ingredients,
      couleur: produitModifie.couleur,
    })
    .eq('id', produitModifie.id)
    .select()
    .single()

  if (error) {
    console.error(
      'Erreur lors de la modification du produit :',
      error
    )
    return
  }

  const produitModifieSupabase = {
    ...produitModifie,
    id: data.id,
  }

  setMenu((ancienMenu) =>
    ancienMenu.map((produit) =>
      produit.id === produitModifieSupabase.id
        ? produitModifieSupabase
        : produit
    )
  )
}

const supprimerProduitDuMenu = async (id) => {
  const { error } = await supabase
    .from('produits')
    .delete()
    .eq('id', id)

  if (error) {
    console.error(
      'Erreur lors de la suppression du produit :',
      error
    )
    return
  }

  setMenu((ancienMenu) =>
    ancienMenu.filter((produit) => produit.id !== id)
  )
}
const ajouterSupplement = async (supplement) => {
  const { data, error } = await supabase
    .from('supplements')
    .insert({
      id: supplement.id,
      nom: supplement.nom,
      prix: supplement.prix,
      categorie: supplement.categorie,
    })
    .select()
    .single()

  if (error) {
    console.error(
      'Erreur lors de l’ajout du supplément :',
      error
    )
    return
  }

  const supplementAjoute = {
    ...supplement,
    id: data.id,
  }

  setSupplements((anciens) => ({
    ...anciens,
    [supplementAjoute.categorie]: [
      ...anciens[supplementAjoute.categorie],
      supplementAjoute,
    ],
  }))
}

const modifierSupplement = async (supplementModifie) => {
  const { data, error } = await supabase
    .from('supplements')
    .update({
      nom: supplementModifie.nom,
      prix: supplementModifie.prix,
      categorie: supplementModifie.categorie,
    })
    .eq('id', supplementModifie.id)
    .select()
    .single()

  if (error) {
    console.error(
      'Erreur lors de la modification du supplément :',
      error
    )
    return
  }

  const supplementModifieSupabase = {
    ...supplementModifie,
    id: data.id,
  }

  setSupplements((anciens) => ({
    ...anciens,
    [supplementModifieSupabase.categorie]: (
      anciens[supplementModifieSupabase.categorie] || []
    ).map((supplement) =>
      supplement.id === supplementModifieSupabase.id
        ? supplementModifieSupabase
        : supplement
    ),
  }))
}

const supprimerSupplement = async (id, categorie) => {
  const { error } = await supabase
    .from('supplements')
    .delete()
    .eq('id', id)

  if (error) {
    console.error(
      'Erreur lors de la suppression du supplément :',
      error
    )
    return
  }

  setSupplements((anciens) => ({
    ...anciens,
    [categorie]: anciens[categorie].filter(
      (supplement) => supplement.id !== id
    ),
  }))
}
  // =========================
  // PANIER
  // =========================

 const ajouterProduit = (produit) => {
  if (!evenement) {
    return
  }

  setCommandesEnCours((anciensPaniers) => {
    const ancienneCommande =
      anciensPaniers[evenement.id] || []

    const existe = ancienneCommande.find(
      (article) => article.id === produit.id
    )

    const nouvelleCommande = existe
      ? ancienneCommande.map((article) =>
          article.id === produit.id
            ? {
                ...article,
                quantite: article.quantite + 1,
              }
            : article
        )
      : [
          ...ancienneCommande,
          {
            ...produit,
            quantite: 1,
          },
        ]

    return {
      ...anciensPaniers,
      [evenement.id]: nouvelleCommande,
    }
  })
}
const diminuerProduit = (id) => {
  if (!evenement) {
    return
  }

  setCommandesEnCours((anciensPaniers) => {
    const ancienneCommande =
      anciensPaniers[evenement.id] || []

    const nouvelleCommande = ancienneCommande
      .map((article) =>
        article.id === id
          ? {
              ...article,
              quantite: article.quantite - 1,
            }
          : article
      )
      .filter((article) => article.quantite > 0)

    return {
      ...anciensPaniers,
      [evenement.id]: nouvelleCommande,
    }
  })
}

const supprimerProduit = (id) => {
  if (!evenement) {
    return
  }

  setCommandesEnCours((anciensPaniers) => {
    const ancienneCommande =
      anciensPaniers[evenement.id] || []

    const nouvelleCommande =
      ancienneCommande.filter(
        (article) => article.id !== id
      )

    return {
      ...anciensPaniers,
      [evenement.id]: nouvelleCommande,
    }
  })
}
  const panierActuel =
  evenement && commandesEnCours[evenement.id]
    ? commandesEnCours[evenement.id]
    : commande
  const total = panierActuel.reduce(
  (somme, article) =>
    somme + Number(article.prix) * article.quantite,
  0
)

const commandesEvenement = commandes
  .filter(
    (item) =>
      String(item.evenementId) ===
      String(evenement?.id)
  )
  .sort(
    (a, b) => Number(a.numero) - Number(b.numero)
  )

const totalEvenement = commandesEvenement.reduce(
  (somme, commande) =>
    somme + Number(commande.total),
  0
)

const totalCarte = commandesEvenement.reduce(
  (somme, commande) =>
    somme +
    (
      commande.montantCarte != null
        ? Number(commande.montantCarte)
        : commande.modePaiement === 'Carte'
          ? Number(commande.total)
          : 0
    ),
  0
)

const totalCash = commandesEvenement.reduce(
  (somme, commande) =>
    somme +
    (
      commande.montantEspeces != null
        ? Number(commande.montantEspeces)
        : commande.modePaiement === 'Espèces'
          ? Number(commande.total)
          : 0
    ),
  0
)

const totalSweet = commandesEvenement.reduce(
  (somme, commande) =>
    somme +
    commande.articles
      .filter((article) => article.categorie === 'Sweet')
      .reduce(
        (total, article) =>
          total +
          Number(article.prix) * article.quantite,
        0
      ),
  0
)

const totalSavoury = commandesEvenement.reduce(
  (somme, commande) =>
    somme +
    commande.articles
      .filter(
        (article) =>
          article.categorie === 'Savoury'
      )
      .reduce(
        (total, article) =>
          total +
          Number(article.prix) * article.quantite,
        0
      ),
  0
)

  // =========================
  // PAIEMENT
  // =========================

const enregistrerPaiement = async () => {
  if (paiementEnCours.current) return

  if (!modePaiement) return

  const especesSaisies = Number(montantRecu)

  // Vérification du paiement en espèces uniquement
  if (
    modePaiement === 'Espèces' &&
    !completerEnCarte &&
    especesSaisies < total
  ) {
    return
  }

  // Vérification du paiement mixte
  if (
    modePaiement === 'Espèces' &&
    completerEnCarte &&
    (
      !Number.isFinite(especesSaisies) ||
      especesSaisies <= 0 ||
      especesSaisies > total
    )
  ) {
    return
  }

  // Répartition des montants
  const montantEspeces =
    modePaiement === 'Carte'
      ? 0
      : completerEnCarte
        ? especesSaisies
        : total

  const montantCarte =
    modePaiement === 'Carte'
      ? total
      : completerEnCarte
        ? total - montantEspeces
        : 0

  paiementEnCours.current = true
  setPaiementEnregistrement(true)

  if (!clePaiementActuelle.current) {
    clePaiementActuelle.current = crypto.randomUUID()
  }

  const clePaiement = clePaiementActuelle.current

  try {
    const numeroCommande = String(
      commandes.filter(
        (item) =>
          String(item.evenementId) ===
          String(evenement.id)
      ).length + 1
    ).padStart(3, '0')

    const { data, error } = await supabase
      .rpc('enregistrer_commande_avec_ticket', {
        p_evenement_id: evenement.id,
        p_numero: numeroCommande,
        p_articles: panierActuel,
        p_total: total,
        p_mode_paiement: modePaiement,
        p_cle_paiement: clePaiement,
        p_montant_especes: montantEspeces,
        p_montant_carte: montantCarte,
      })

    let commandeEnregistree = data?.[0] ?? null

    if (error) {
      console.error(
        'Erreur lors de l’enregistrement :',
        error
      )

      const {
        data: commandeExistante,
        error: erreurRecherche,
      } = await supabase
        .from('commandes')
        .select('*')
        .eq('cle_paiement', clePaiement)
        .maybeSingle()

      if (erreurRecherche || !commandeExistante) {
        console.error(
          'Impossible de confirmer le paiement. La clé est conservée pour réessayer sans créer une nouvelle tentative.'
        )
        return
      }

      commandeEnregistree = commandeExistante
    }

    if (!commandeEnregistree) {
      console.error(
        'Aucune commande retournée par Supabase.'
      )
      return
    }

    console.log(
      'PAIEMENT CONFIRMÉ, ACTUALISATION DU TICKET'
    )

    const {
      data: compteurActualise,
      error: erreurCompteur,
    } = await supabase
      .from('compteurs_tickets')
      .select('dernier_ticket')
      .eq('evenement_id', evenement.id)
      .maybeSingle()

    console.log('RÉSULTAT COMPTEUR APRÈS PAIEMENT :', {
      compteurActualise,
      erreurCompteur,
      evenementId: evenement.id,
    })

    if (erreurCompteur) {
      console.error(
        'Erreur lors de l’actualisation du prochain ticket :',
        erreurCompteur
      )
    } else {
      const dernierTicket = Number(
        compteurActualise?.dernier_ticket ?? 0
      )

      setProchainTicket((dernierTicket % 20) + 1)
    }

    const nouvelleCommande = {
      id: commandeEnregistree.id,
      evenementId: commandeEnregistree.evenement_id,
      numero: commandeEnregistree.numero,
      numeroTicket: commandeEnregistree.numero_ticket,
      articles: commandeEnregistree.articles,
      total: commandeEnregistree.total,
      modePaiement: commandeEnregistree.mode_paiement,
      montantEspeces: commandeEnregistree.montant_especes,
      montantCarte: commandeEnregistree.montant_carte,
      statut: commandeEnregistree.statut,
    }

    setCommandes((anciennesCommandes) =>
      anciennesCommandes.some(
        (commande) =>
          String(commande.id) ===
          String(nouvelleCommande.id)
      )
        ? anciennesCommandes
        : [...anciennesCommandes, nouvelleCommande]
    )

    setCommandesEnCours((anciensPaniers) => ({
      ...anciensPaniers,
      [evenement.id]: [],
    }))

    clePaiementActuelle.current = null

    setPaiement(false)
    setModePaiement('')
    setMontantRecu('')
    setCompleterEnCarte(false)

  } catch (erreur) {
    console.error(
      'Erreur inattendue lors du paiement :',
      erreur
    )
  } finally {
    paiementEnCours.current = false
    setPaiementEnregistrement(false)
  }
}



  // =========================
  // CUISINE
  // =========================

const changerStatut = async (id, nouveauStatut) => {

  const { error } = await supabase
    .from('commandes')
    .update({
      statut: nouveauStatut,
    })
    .eq('id', id)

if (error) {
  console.error(
    'ERREUR UPDATE COMMANDE :',
    error.message
  )

  console.error(
    'DETAILS UPDATE COMMANDE :',
    error
  )

  return
}

  setCommandes((anciennesCommandes) =>
    anciennesCommandes.map((commande) =>
      commande.id === id
        ? {
            ...commande,
            statut: nouveauStatut,
          }
        : commande
    )
  )
}



const supprimerCommande = async (commande) => {
  const confirmation = window.confirm(
    `Attention : veux-tu vraiment supprimer la commande #${commande.numero} (ticket ${commande.numeroTicket ?? '—'}) ? Cette action est définitive.`
  )

  if (!confirmation) return

const { data, error } = await supabase
  .from('commandes')
  .delete()
  .eq('id', commande.id)
  .select('id')

  if (error) {
    console.error('ERREUR SUPPRESSION COMMANDE :', error.message)
    window.alert('La suppression a échoué. Vérifie la console.')
    return
  }

  setCommandes((anciennesCommandes) =>
    anciennesCommandes.filter(
      (ancienneCommande) =>
        String(ancienneCommande.id) !== String(commande.id)
    )
  )
}



const modifierCommande = async () => {
  if (!commandeEnModification) return

  if (articlesEnModification.length === 0) {
    console.error(
      'Impossible d’enregistrer une commande vide. Utilise la suppression pour supprimer toute la commande.'
    )
    return
  }

  const nouveauTotal = articlesEnModification.reduce(
    (somme, article) =>
      somme + Number(article.prix) * Number(article.quantite),
    0
  )

  const { data, error } = await supabase
    .from('commandes')
    .update({
      articles: articlesEnModification,
      total: nouveauTotal,
    })
    .eq('id', commandeEnModification.id)
    .select()
    .single()

  if (error) {
    console.error(
      'ERREUR MODIFICATION COMMANDE :',
      error.message
    )
    return
  }

  const commandeActualisee = {
    id: data.id,
    evenementId: data.evenement_id,
    numero: data.numero,
    numeroTicket: data.numero_ticket,
    articles: data.articles,
    total: data.total,
    modePaiement: data.mode_paiement,
    statut: data.statut,
  }

  setCommandes((anciennesCommandes) =>
    anciennesCommandes.map((commande) =>
      String(commande.id) === String(commandeActualisee.id)
        ? commandeActualisee
        : commande
    )
  )

  setCommandeEnModification(null)
  setArticlesEnModification([])
}

const produitsAffiches = menu.filter(
  (produit) =>
    produit.categorie === categorie &&
    produit.visible !== false
)
  .sort(
    (a, b) =>
      (a.ordre ?? 9999) -
      (b.ordre ?? 9999)
  )
  .map((produit) => ({
    ...produit,
    prix:
      evenement?.template === 'marche'
        ? produit.prixMarche
        : produit.prixEvenement,
  }))
const commandesHistorique =
  evenementSelectionne?.commandes || []

console.table(
  commandesHistorique.map((commande) => ({
    numero: commande.numero,
    created_at: commande.created_at,
  }))
)

if (commandesHistorique.length > 0) {
  console.log(
    'TEST DATE :',
    new Date(commandesHistorique[0].created_at).toString(),
    new Date(commandesHistorique[0].created_at).getHours()
  )
}

const totalHistorique =
  commandesHistorique.reduce(
    (somme, commande) =>
      somme + Number(commande.total),
    0
  )

const totalCarteHistorique =
  commandesHistorique.reduce(
    (somme, commande) =>
      somme +
      (
        commande.montantCarte != null
          ? Number(commande.montantCarte)
          : commande.modePaiement === 'Carte'
            ? Number(commande.total)
            : 0
      ),
    0
  )

const totalCashHistorique =
  commandesHistorique.reduce(
    (somme, commande) =>
      somme +
      (
        commande.montantEspeces != null
          ? Number(commande.montantEspeces)
          : commande.modePaiement === 'Espèces'
            ? Number(commande.total)
            : 0
      ),
    0
  )

const nombreCommandesHistorique =
  commandesHistorique.length

const nombreCrepesHistorique =
  commandesHistorique.reduce(
    (total, commande) =>
      total +
      commande.articles.reduce(
        (quantite, article) =>
          quantite + article.quantite,
        0
      ),
    0
  )

const nombreSweetHistorique =
  commandesHistorique.reduce(
    (total, commande) =>
      total +
      commande.articles
        .filter(
          (article) =>
            article.categorie === 'Sweet'
        )
        .reduce(
          (quantite, article) =>
            quantite + article.quantite,
          0
        ),
    0
  )

const nombreSavouryHistorique =
  commandesHistorique.reduce(
    (total, commande) =>
      total +
      commande.articles
        .filter(
          (article) =>
            article.categorie === 'Savoury'
        )
        .reduce(
          (quantite, article) =>
            quantite + article.quantite,
          0
        ),
    0
  )

const panierMoyenHistorique =
  nombreCommandesHistorique > 0
    ? totalHistorique /
      nombreCommandesHistorique
    : 0

const quantitesParProduit = {}

commandesHistorique.forEach((commande) => {
  commande.articles.forEach((article) => {
    if (!quantitesParProduit[article.nom]) {
      quantitesParProduit[article.nom] = 0
    }

    quantitesParProduit[article.nom] +=
      article.quantite
  })
})
const produitsVendusHistorique =
  Object.entries(quantitesParProduit)
    .sort(
      ([, quantiteA], [, quantiteB]) =>
        quantiteB - quantiteA
    )

// Données du camembert des produits vendus

const totalProduitsVendus =
  produitsVendusHistorique.reduce(
    (total, [, quantite]) => total + quantite,
    0
  )

const couleursCamembert = [
  '#E9A0B0',
  '#8BB9A5',
  '#F2C879',
  '#91A9D5',
  '#B69AD5',
  '#E69A6B',
  '#8FC9CC',
  '#D58EAA',
  '#A5B77D',
  '#B0A0A0',
]

let cumulPourcentage = 0

const repartitionProduitsCamembert =
  produitsVendusHistorique.map(
    ([nom, quantite], index) => {
      const debut = cumulPourcentage

      const pourcentage =
        totalProduitsVendus > 0
          ? (quantite / totalProduitsVendus) * 100
          : 0

      cumulPourcentage += pourcentage

      return {
        nom,
        quantite,
        pourcentage,
        debut,
        fin: cumulPourcentage,
        couleur:
          couleursCamembert[
            index % couleursCamembert.length
          ],
      }
    }
  )
// Commandes et chiffre d'affaires par heure

const statistiquesHoraires = (() => {
  const tranches = Array.from({ length: 24 }, (_, heure) => ({
    heure: heure * 60,
    nombreCommandes: 0,
    chiffreAffaires: 0,
  }))

  commandesHistorique.forEach((commande) => {
    if (!commande.created_at) return

    const date = new Date(commande.created_at)

    if (isNaN(date.getTime())) return

    const heure = date.getHours()
    const tranche = tranches[heure]

    tranche.nombreCommandes += 1
    tranche.chiffreAffaires += Number(commande.total)
  })

  const premieresTranches = tranches.filter(
    (tranche) => tranche.nombreCommandes > 0
  )

  if (premieresTranches.length === 0) return []

  const premiereHeure = premieresTranches[0].heure
  const derniereHeure =
    premieresTranches[premieresTranches.length - 1].heure

  return tranches.filter(
    (tranche) =>
      tranche.heure >= premiereHeure &&
      tranche.heure <= derniereHeure
  )
})()

// Commandes et chiffre d'affaires par tranche de 15 minutes

const statistiquesQuartsHeure = (() => {
  const tranches = Array.from({ length: 96 }, (_, index) => ({
    heure: index * 15,
    nombreCommandes: 0,
    chiffreAffaires: 0,
  }))

  commandesHistorique.forEach((commande) => {
    if (!commande.created_at) return

    const date = new Date(commande.created_at)
    if (isNaN(date.getTime())) return

    const minutes =
      date.getHours() * 60 +
      Math.floor(date.getMinutes() / 15) * 15

    const tranche = tranches[minutes / 15]

    tranche.nombreCommandes += 1
    tranche.chiffreAffaires += Number(commande.total)
  })

  const premieresTranches = tranches.filter(
    (tranche) => tranche.nombreCommandes > 0
  )

  if (premieresTranches.length === 0) return []

  const premiereHeure = premieresTranches[0].heure
  const derniereHeure =
    premieresTranches[premieresTranches.length - 1].heure

  return tranches.filter(
    (tranche) =>
      tranche.heure >= premiereHeure &&
      tranche.heure <= derniereHeure
  )
})()

return (
  <div className="app">
  {chargementSession ? (
  <div className="ecran-chargement">
    <div className="chargement-crepe">🥞</div>
    <h2>Get Your Crêpes</h2>
    <p>Chargement...</p>
    <div className="barre-chargement">
      <div className="barre-chargement-progress"></div>
    </div>
  </div>
) : !session ? (
      <div className="ecran-connexion">
        <div className="carte-connexion">
          <h1>🥞 Get Your Crêpes</h1>
          <h2>Connexion</h2>

          <form onSubmit={seConnecter}>
            <input
              type="email"
              placeholder="Adresse e-mail"
              value={emailConnexion}
              onChange={(e) =>
                setEmailConnexion(e.target.value)
              }
              required
            />

            <input
              type="password"
              placeholder="Mot de passe"
              value={motDePasseConnexion}
              onChange={(e) =>
                setMotDePasseConnexion(e.target.value)
              }
              required
            />

            {erreurConnexion && (
              <p className="erreur-connexion">
                {erreurConnexion}
              </p>
            )}

            <button
              type="submit"
              disabled={connexionEnCours}
            >
              {connexionEnCours
                ? 'Connexion...'
                : 'Se connecter'}
            </button>
          </form>
        </div>
      </div>
) : (
  <>
    {chargementEvenements ? (
      <div className="ecran-chargement">
  <div className="chargement-crepe">🥞</div>
  <h2>Get Your Crêpes</h2>
  <p>Chargement...</p>
  <div className="barre-chargement">
    <div className="barre-chargement-progress"></div>
  </div>
</div>
    ) : historique ? (
  <div className="historique-evenements">

    {evenementSelectionne ? (
      <div className="detail-historique">

        <div className="titre-detail-historique">

          <button
            type="button"
            className="retour-detail-historique"
            onClick={() => {
              setEvenementSelectionne(null)
            }}
          >
            ⬅️
          </button>

          <div>
            <h1>{evenementSelectionne.nom}</h1>
            <p>{evenementSelectionne.date}</p>
          </div>

        </div>

        <div className="onglets-historique">

          <button
            type="button"
            className={
              vueHistorique === 'statistiques'
                ? 'active'
                : ''
            }
            onClick={() =>
              setVueHistorique('statistiques')
            }
          >
            📊 Statistiques
          </button>

          <button
            type="button"
            className={
              vueHistorique === 'commandes'
                ? 'active'
                : ''
            }
            onClick={() =>
              setVueHistorique('commandes')
            }
          >
            🧾 Commandes
          </button>

        </div>

{vueHistorique === 'statistiques' ? (
  <div className="statistiques-historique">

    <h2>📊 Statistiques</h2>

    <div className="cartes-statistiques">

      <div className="carte-statistique">
        <span>💰 CA total</span>
        <strong>
          {totalHistorique.toFixed(2)} $
        </strong>
      </div>

      <div className="carte-statistique">
        <span>💳 Carte</span>
        <strong>
          {totalCarteHistorique.toFixed(2)} $
        </strong>
      </div>

      <div className="carte-statistique">
        <span>💵 Espèces</span>
        <strong>
          {totalCashHistorique.toFixed(2)} $
        </strong>
      </div>

      <div className="carte-statistique">
        <span>🧾 Commandes</span>
        <strong>
          {nombreCommandesHistorique}
        </strong>
      </div>

      <div className="carte-statistique">
        <span>🥞 Crêpes vendues</span>
        <strong>
          {nombreCrepesHistorique}
        </strong>
      </div>

      <div className="carte-statistique">
        <span>🧺 Panier moyen</span>
        <strong>
          {panierMoyenHistorique.toFixed(2)} $
        </strong>
      </div>

    </div>

    <div className="repartition-crepes">

      <h3>Répartition</h3>

      <div>
        <span>🍫 Sweet</span>
        <strong>
          {nombreSweetHistorique}
        </strong>
      </div>

      <div>
        <span>🧀 Savoury</span>
        <strong>
          {nombreSavouryHistorique}
        </strong>
      </div>

    </div>
    <div className="produits-vendus-historique">

  <h3>🥞 Produits vendus</h3>

<div className="camembert-produits-historique">
  <h3>🥧 Répartition des produits vendus</h3>

  {totalProduitsVendus === 0 ? (
    <p>Aucun produit vendu</p>
  ) : (
<div className="contenu-camembert">

  <div className="legende-camembert">
    {repartitionProduitsCamembert.map((produit) => (
      <div className="ligne-legende-camembert" key={produit.nom}>

        <span
          className="couleur-legende-camembert"
          style={{ backgroundColor: produit.couleur }}
        />

        <span className="nom-legende-camembert">
          {produit.nom}
        </span>

        <strong className="quantite-legende-camembert">
          ×{produit.quantite}
        </strong>

        <strong className="pourcentage-legende-camembert">
          {produit.pourcentage.toFixed(1)} %
        </strong>

      </div>
    ))}
  </div>

  <svg viewBox="0 0 200 200" className="graphique-camembert">
    {repartitionProduitsCamembert.map((produit) => {
      const angleDebut = produit.debut * 3.6 - 90
      const angleFin = produit.fin * 3.6 - 90

      const x1 = 100 + 90 * Math.cos(angleDebut * Math.PI / 180)
      const y1 = 100 + 90 * Math.sin(angleDebut * Math.PI / 180)

      const x2 = 100 + 90 * Math.cos(angleFin * Math.PI / 180)
      const y2 = 100 + 90 * Math.sin(angleFin * Math.PI / 180)

      const grandArc = produit.pourcentage > 50 ? 1 : 0

      if (produit.pourcentage >= 99.99) {
        return (
          <circle
            key={produit.nom}
            cx="100"
            cy="100"
            r="90"
            fill={produit.couleur}
          />
        )
      }

      return (
        <path
          key={produit.nom}
          d={`M 100 100 L ${x1} ${y1} A 90 90 0 ${grandArc} 1 ${x2} ${y2} Z`}
          fill={produit.couleur}
          stroke="white"
          strokeWidth="1.5"
        />
      )
    })}
  </svg>

</div>
  )}
</div>

</div>

{/* Graphiques horaires */}

<div className="graphiques-horaires">
<div className="graphique-horaire">
  <h3>🧾 Commandes par heure</h3>

  {statistiquesHoraires.length === 0 ? (
    <p>Aucune donnée disponible</p>
  ) : (
    <>

<div
  className="conteneur-vues-horaires"
  onScroll={(e) =>
    setVueHoraireActive(
      e.currentTarget.scrollLeft >= e.currentTarget.clientWidth / 2 ? 1 : 0
    )
  }
>
  <div className="vue-horaire-slide">

      {/* Vue simplifiée */}
      <div className="vue-simple-horaire">
        {statistiquesHoraires
          .filter(stat => stat.nombreCommandes > 0)
          .map(stat => (
            <div className="barre-horaire" key={stat.heure}>
              <span className="heure-horaire">
                {`${String(Math.floor(stat.heure / 60)).padStart(2, '0')}h${String(stat.heure % 60).padStart(2, '0')}`}
              </span>

              <div className="fond-barre-horaire">
                <div
                  className="remplissage-barre-horaire commandes"
                  style={{
                    width: `${
                      stat.nombreCommandes /
                      Math.max(...statistiquesHoraires.map(s => s.nombreCommandes)) *
                      100
                    }%`,
                  }}
                />
              </div>

              <strong>{stat.nombreCommandes}</strong>
            </div>
          ))}
      </div>
  </div>

  <div className="vue-horaire-slide">
         {/* Vue détaillée */}
      <div className="courbe-horaire">
        <svg viewBox="0 0 600 280" className="graphique-svg">
          <line x1="50" y1="20" x2="50" y2="230" className="axe-graphique" />
          <line x1="50" y1="230" x2="580" y2="230" className="axe-graphique" />

          {Array.from({ length: 5 }, (_, i) => {
            const maximum = Math.max(1, ...statistiquesQuartsHeure.map(s => s.nombreCommandes))
            const valeur = Math.ceil(maximum * (4 - i) / 4)
            const y = 230 - (valeur / maximum) * 200

            return (
              <g key={i}>
                <line x1="50" y1={y} x2="580" y2={y} className="grille-graphique" />
                <text x="40" y={y + 4} textAnchor="end" className="texte-graphique">
                  {valeur}
                </text>
              </g>
            )
          })}

          <polyline
            fill="none"
            className="ligne-commandes"
            points={statistiquesQuartsHeure.map((stat, i) => {
              const x = 50 + (i / Math.max(1, statistiquesQuartsHeure.length - 1)) * 530
              const maximum = Math.max(1, ...statistiquesQuartsHeure.map(s => s.nombreCommandes))
              const y = 230 - (stat.nombreCommandes / maximum) * 200
              return `${x},${y}`
            }).join(' ')}
          />

          {statistiquesQuartsHeure.map((stat, i) => {
            const x = 50 + (i / Math.max(1, statistiquesQuartsHeure.length - 1)) * 530
            const maximum = Math.max(1, ...statistiquesQuartsHeure.map(s => s.nombreCommandes))
            const y = 230 - (stat.nombreCommandes / maximum) * 200

            return (
              <g key={stat.heure}>
                <circle cx={x} cy={y} r="5" className="point-commandes">
                  <title>
                    {`${String(Math.floor(stat.heure / 60)).padStart(2, '0')}h${String(stat.heure % 60).padStart(2, '0')} : ${stat.nombreCommandes} commande(s)`}
                  </title>
                </circle>

                {stat.heure % 60 === 0 && (
                  <text x={x} y="250" textAnchor="middle" className="texte-graphique">
                    {`${String(Math.floor(stat.heure / 60)).padStart(2, '0')}h`}
                  </text>
                )}

                <text x={x} y={y - 12} textAnchor="middle" className="valeur-graphique">
                  {stat.nombreCommandes}
                </text>
              </g>
            )
          })}
                </svg>
            </div>
    </div>
  </div>

  <div className="indicateurs-vues-horaires">
    <span className={vueHoraireActive === 0 ? 'actif' : ''}></span>
    <span className={vueHoraireActive === 1 ? 'actif' : ''}></span>
  </div>

  </>
  )}
</div>

<div className="graphique-horaire">
  <h3>💰 Chiffre d'affaires par heure</h3>

  {statistiquesHoraires.length === 0 ? (
    <p>Aucune donnée disponible</p>
  ) : (
    <div className="courbe-horaire">
      <svg viewBox="0 0 600 280" className="graphique-svg">
        <line x1="50" y1="20" x2="50" y2="230" className="axe-graphique" />
        <line x1="50" y1="230" x2="580" y2="230" className="axe-graphique" />

        {Array.from({ length: 5 }, (_, i) => {
          const maximum = Math.max(
            1,
            ...statistiquesHoraires.map(s => s.chiffreAffaires)
          )
          const valeur = maximum * (4 - i) / 4
          const y = 230 - (valeur / maximum) * 200

          return (
            <g key={i}>
              <line x1="50" y1={y} x2="580" y2={y} className="grille-graphique" />
              <text x="40" y={y + 4} textAnchor="end" className="texte-graphique">
                {valeur.toFixed(0)} $
              </text>
            </g>
          )
        })}

        <polyline
          fill="none"
          className="ligne-chiffre-affaires"
          points={statistiquesHoraires.map((stat, i) => {
            const x = 50 + (i / Math.max(1, statistiquesHoraires.length - 1)) * 530
            const maximum = Math.max(1, ...statistiquesHoraires.map(s => s.chiffreAffaires))
            const y = 230 - (stat.chiffreAffaires / maximum) * 200
            return `${x},${y}`
          }).join(' ')}
        />

        {statistiquesHoraires.map((stat, i) => {
          const x = 50 + (i / Math.max(1, statistiquesHoraires.length - 1)) * 530
          const maximum = Math.max(1, ...statistiquesHoraires.map(s => s.chiffreAffaires))
          const y = 230 - (stat.chiffreAffaires / maximum) * 200

          return (
            <g key={stat.heure}>
              <circle
  cx={x}
  cy={y}
  r="8"
  className="point-chiffre-affaires"
  style={{ cursor: 'pointer' }}
>
  <title>
    {`${String(Math.floor(stat.heure / 60)).padStart(2, '0')}h${String(stat.heure % 60).padStart(2, '0')} : ${stat.chiffreAffaires.toFixed(2)} $`}
  </title>
</circle>
              {stat.heure % 60 === 0 && (
  <text x={x} y="250" textAnchor="middle" className="texte-graphique">
    {`${String(Math.floor(stat.heure / 60)).padStart(2, '0')}h`}
  </text>
)}
              <text x={x} y={y - 12} textAnchor="middle" className="valeur-graphique">
                {stat.chiffreAffaires.toFixed(0)} $
              </text>
            </g>
          )
        })}
      </svg>
    </div>
  )}
</div>

</div>

  </div>

) : (
  <div className="commandes-historique">

    <h2>🧾 Commandes</h2>

    {commandesHistorique.length === 0 ? (
      <p className="historique-vide">
        Aucune commande pour cet événement
      </p>
    ) : (
      <div className="liste-commandes-historique">

        {commandesHistorique.map((commande) => (
          <div
            className="carte-commande-historique"
            key={commande.id}
          >

            <div className="entete-commande-historique">


<div className="infos-commande-historique">
  <span className="ticket-historique">
    Ticket : {commande.numeroTicket ?? '—'}
  </span>
  <strong>
    Commande #{commande.numero}
  </strong>
</div>


              <span>
                {commande.total.toFixed(2)} $
              </span>

            </div>

            <div className="details-commande-historique">

              {commande.articles.map((article) => (
                <div
                  className="article-historique"
                  key={article.id}
                >

                  <div className="article-historique-principal">
                    <span>
                      {article.quantite} ×
                    </span>

                    <strong>
                      {article.nom}
                    </strong>
                  </div>

                  {article.personnalise && (
                    <div className="personnalisation-historique">

                      {article.ingredientsRetires?.map(
                        (ingredient, index) => (
                          <div
                            key={`retire-${index}`}
                          >
                            Sans {ingredient.nom}
                          </div>
                        )
                      )}

                      {article.supplements?.map(
                        (supplement) => (
                          <div
                            key={`supplement-${supplement.id}`}
                          >
                            + {supplement.nom}
                          </div>
                        )
                      )}

                    </div>
                  )}

                </div>
              ))}

            </div>

            <div className="pied-commande-historique">

  <span>
    {Number(commande.montantCarte ?? 0) > 0 &&
    Number(commande.montantEspeces ?? 0) > 0
      ? `Espèces : ${Number(commande.montantEspeces).toFixed(2)} $ | Carte : ${Number(commande.montantCarte).toFixed(2)} $`
      : commande.modePaiement}
  </span>

  <span>
    Total : {Number(commande.total).toFixed(2)} $
  </span>

</div>

          </div>
        ))}

      </div>
    )}

  </div>
)}

      </div>
    ) : (
      <div>

        <div className="titre-historique">
  <button
    type="button"
    className="retour-accueil-historique"
    onClick={() => {
      setHistorique(false)
      setAccueil(true)
      setRechercheHistorique('')
      setDateRechercheHistorique('')
    }}
  >
    ⬅️
  </button>

  <h1>Historique des événements</h1>
</div>

        <div className="recherche-historique">

          <input
            type="text"
            placeholder="🔎 Rechercher par nom..."
            value={rechercheHistorique}
            onChange={(e) =>
              setRechercheHistorique(e.target.value)
            }
          />

          <input
  className="champ-date-historique"
  type="date"
  value={dateRechercheHistorique}
  onChange={(e) =>
    setDateRechercheHistorique(e.target.value)
  }
/>

        </div>

        {historiqueEvenements.length === 0 ? (
          <p className="historique-vide">
            Aucun événement terminé
          </p>
        ) : (
          <div className="liste-historique">

            {[...historiqueEvenements]
  .filter((ancienEvenement) => {
                const recherche =
                  rechercheHistorique.toLowerCase().trim()

                const correspondNom =
  !recherche ||
  String(ancienEvenement.nom ?? '')
    .toLowerCase()
    .includes(recherche)

                const correspondDate =
                  !dateRechercheHistorique ||
                  ancienEvenement.date ===
                    dateRechercheHistorique

                return correspondNom && correspondDate
})
.map((ancienEvenement) => {

                const total =
                  ancienEvenement.commandes.reduce(
                    (somme, commande) =>
                      somme + Number(commande.total),
                    0
                  )

                return (
                 <div
  className="carte-historique"
  key={ancienEvenement.id}
  onClick={() => {
  console.log(
    'EVENEMENT CLIQUE :',
    ancienEvenement.nom,
    ancienEvenement.commandes?.length,
    ancienEvenement.commandes?.[0]?.created_at
  )

  setEvenementSelectionne(ancienEvenement)
  setVueHistorique('statistiques')
}}
>

                    <div className="infos-historique">

                      <strong>
                        {ancienEvenement.nom}
                      </strong>

                      <span>
                        {ancienEvenement.date}
                      </span>

                      <small>
                        {ancienEvenement.template === 'marche'
                          ? '🏪 Prix marché'
                          : '🎪 Prix événement'}
                      </small>

                    </div>

<div className="actions-historique">

  <div className="ligne-actions-historique">

    <strong>
      {total.toFixed(2)} $
    </strong>

<button
  type="button"
  className="supprimer-historique"
  onClick={async (e) => {
    e.stopPropagation()

    const confirmer = window.confirm(
      `Supprimer l'événement "${ancienEvenement.nom}" de l'historique ?`
    )

    if (!confirmer) {
      return
    }


const { data: evenementSupprime, error: erreurEvenement } =
  await supabase
    .from('evenements')
    .delete()
    .eq('id', ancienEvenement.id)
    .select()

if (erreurEvenement) {
  console.error(
    'Erreur lors de la suppression de l’événement :',
    erreurEvenement
  )
  alert('Impossible de supprimer cet événement.')
  return
}

if (!evenementSupprime || evenementSupprime.length === 0) {
  console.error('Aucun événement supprimé dans Supabase.')
  alert('L’événement n’a pas été supprimé dans la base de données.')
  return
}

setHistoriqueEvenements((anciensEvenements) =>
  anciensEvenements.filter(
    (evenement) =>
      String(evenement.id) !== String(ancienEvenement.id)
  )
)
  }}
>
  🗑️
</button>

  </div>


                    </div>

                  </div>
                )
              })}

          </div>
        )}
      </div>
    )}

  </div>

) : accueil ? (
  <div className="accueil-evenement">

<h1>🥞 Get Your Crêpes </h1>

{evenement && !creationEvenement ? (
      <>
 <div className="carte-evenement">
  <h2>🎪 Événements en cours</h2>

  <div className="liste-evenements-actifs">
    {evenementsActifs.map((evenementActif) => (
      <div
        className="evenement-actif"
        key={evenementActif.id}
      >
        <div className="infos-evenement-actif">
          <strong>{evenementActif.nom}</strong>
          <span>{evenementActif.date}</span>
        </div>

        <button
          type="button"
          onClick={() => {
            setEvenement(evenementActif)
            setEvenementSelectionneId(evenementActif.id)
            localStorage.setItem(
  'evenementSelectionneId',
  evenementActif.id
)
            setAccueil(false)
            setCreationEvenement(false)
            setHistorique(false)
            setAdmin(false)
            setCuisine(false)
          }}
        >
          ▶️ Reprendre
        </button>
      </div>
    ))}
  </div>
</div>
        <div className="actions-accueil">
 <button
  type="button"
  className="bouton-accueil nouvel-evenement"
onClick={() => {
  setNomEvenement('')
  setDateEvenement(obtenirDateDuJour())
  setTemplateEvenement('evenement')
  setCreationEvenement(true)
  setAccueil(true)
}}
>
  ➕ Nouvel événement
</button>

 <button
  type="button"
  className="bouton-accueil historique formulaire-historique"
  onClick={() => {
    setHistorique(true)
    setAccueil(false)
  }}
>
  📚 Historique
</button>
<button
  type="button"
  className="bouton-accueil analyse"
  onClick={() => {
    setAnalyse(true)
    localStorage.setItem('pageActuelle', 'analyse')
    setAccueil(false)
    setHistorique(false)
    setAdmin(false)
    setCuisine(false)
  }}
>
  📊 Analyse
</button>
<button
  type="button"
  className="bouton-accueil administration formulaire-administration"
  onClick={() => {
    setAdmin(true)
    setAccueil(false)
    setHistorique(false)
    setCuisine(false)
  }}
>
  ⚙️ Administration
</button>
<button
  type="button"
  className="bouton-accueil deconnexion"
  onClick={seDeconnecter}
>
  🚪 Se déconnecter
</button>
        </div>
      </>
    ) : (
      <>
        <div className="carte-evenement">
          <h2>Nouvel événement</h2>

          <form onSubmit={creerEvenement}>

            <label>
              Nom de l'événement
            </label>

            <input
              type="text"
              placeholder="Ex : Marché de Takapuna"
              value={nomEvenement}
              onChange={(e) =>
                setNomEvenement(e.target.value)
              }
            />

            <label>
              Date
            </label>

            <input
  className="champ-date-evenement"
  type="date"
  value={dateEvenement}
  onChange={(e) =>
    setDateEvenement(e.target.value)
  }
/>

            <label>
              Tarification
            </label>

            <div className="templates-evenement">

              <button
                type="button"
                className={
                  templateEvenement === 'evenement'
                    ? 'active'
                    : ''
                }
                onClick={() =>
                  setTemplateEvenement('evenement')
                }
              >
                🎪 Prix événement
              </button>

              <button
                type="button"
                className={
                  templateEvenement === 'marche'
                    ? 'active'
                    : ''
                }
                onClick={() =>
                  setTemplateEvenement('marche')
                }
              >
                🏪 Prix marché
              </button>

            </div>

            <button
              type="submit"
              className="demarrer-evenement"
              disabled={
  !nomEvenement ||
  !dateEvenement ||
  creationEnCours
}
            >
              🚀 Démarrer l'événement
            </button>
<button
  type="button"
  className="bouton-accueil reprendre-evenement"
  onClick={() => {
    setCreationEvenement(false)
    setAccueil(true)

    if (evenementsActifs.length > 0) {
      const evenementActif =
        evenementsActifs.find(
          (item) =>
            String(item.id) ===
            String(evenementSelectionneId)
        ) || evenementsActifs[0]

      setEvenement(evenementActif)
      setEvenementSelectionneId(evenementActif.id)

      localStorage.setItem(
        'evenementSelectionneId',
        evenementActif.id
      )
    }
  }}
>
  ▶️ Reprendre un événement
</button>
          </form>
        </div>

        <div className="actions-accueil">
          <button
  type="button"
  className="bouton-accueil historique"
  onClick={() => {
    setHistorique(true)
    setAccueil(false)
  }}
>
  📚 Historique
</button>

<button
  type="button"
  className="bouton-accueil analyse"
  onClick={() => {
    setAnalyse(true)
    localStorage.setItem('pageActuelle', 'analyse')
    setAccueil(false)
    setCreationEvenement(false)
    setHistorique(false)
    setAdmin(false)
    setCuisine(false)
  }}
>
  📊 Analyse
</button>

         <button
  type="button"
  className="bouton-accueil administration"
  onClick={() => {
    setAdmin(true)
    setAccueil(false)
    setHistorique(false)
    setCuisine(false)
  }}
>
  ⚙️ Administration
</button>
<button
  type="button"
  className="bouton-accueil deconnexion"
  onClick={seDeconnecter}
>
  🚪 Se déconnecter
</button>
        </div>
      </>
    )}

  </div>
) : (

      <>
{!admin && !analyse && (
  <header>

    <div className="navigation-principale">

      <button
        type="button"
        onClick={allerAccueil}
        className={accueil ? 'active' : ''}
      >
        🏠
      </button>

      <button
        type="button"
        onClick={() => {
          setAccueil(false)
          setCuisine(false)
          setHistorique(false)
          setHistoriqueCommandesActif(false)
          setAdmin(false)
        }}
        className={
          !accueil &&
          !cuisine &&
          !historique &&
          !historiqueCommandesActif &&
          !admin
            ? 'active'
            : ''
        }
      >
        🥞 Caisse
      </button>

      <button
        type="button"
        onClick={() => {
          setAccueil(false)
          setCuisine(true)
          setHistorique(false)
          setHistoriqueCommandesActif(false)
          setAdmin(false)
        }}
        className={cuisine ? 'active' : ''}
      >
        👨‍🍳 Cuisine
      </button>

      <button
        type="button"
        onClick={() => {
          setAccueil(false)
          setCuisine(false)
          setHistorique(false)
          setHistoriqueCommandesActif(true)
          setAdmin(false)
        }}
        className={
          historiqueCommandesActif
            ? 'active'
            : ''
        }
      >
        🧾
      </button>

    </div>
  </header>
)}

{analyse ? (
  <div className="page-analyse">

    <div className="titre-historique">
      <button
        type="button"
        className="retour-accueil-historique"
        onClick={() => {
          setAnalyse(false)
          setAccueil(true)
        }}
      >
        ⬅️
      </button>

      <h1>📊 Analyse globale</h1>
    </div>

    <div className="periodes-analyse">

  <button
    type="button"
    className={periodeAnalyse === 'semaine' ? 'active' : ''}
    onClick={() => setPeriodeAnalyse('semaine')}
  >
    Semaine
  </button>

  <button
    type="button"
    className={periodeAnalyse === 'mois' ? 'active' : ''}
    onClick={() => setPeriodeAnalyse('mois')}
  >
    Mois
  </button>

  <button
    type="button"
    className={periodeAnalyse === 'annee' ? 'active' : ''}
    onClick={() => setPeriodeAnalyse('annee')}
  >
    Année
  </button>

</div>

<div className="indicateurs-analyse">

  <div className="carte-indicateur-analyse">
    <span>💰 Chiffre d'affaires</span>
    <strong>{chiffreAffairesAnalyse.toFixed(2)} $</strong>
    <small className={
  evolutionCAAnalyse >= 0 ? 'evolution-positive' : 'evolution-negative'
}>
  {evolutionCAAnalyse >= 0 ? '▲' : '▼'}
  {' '}{Math.abs(evolutionCAAnalyse).toFixed(1)} %
  {' '}vs période précédente
</small>
  </div>

  <div className="carte-indicateur-analyse">
    <span>🧾 Commandes</span>
    <strong>{nombreCommandesAnalyse}</strong>
    <small className={
  evolutionCommandesAnalyse >= 0
    ? 'evolution-positive'
    : 'evolution-negative'
}>
  {evolutionCommandesAnalyse >= 0 ? '▲' : '▼'}
  {' '}{Math.abs(evolutionCommandesAnalyse).toFixed(1)} %
  {' '}vs période précédente
</small>
  </div>

  <div className="carte-indicateur-analyse">
    <span>🛒 Panier moyen</span>
    <strong>{panierMoyenAnalyse.toFixed(2)} $</strong>
    <small className={
  evolutionPanierAnalyse >= 0
    ? 'evolution-positive'
    : 'evolution-negative'
}>
  {evolutionPanierAnalyse >= 0 ? '▲' : '▼'}
  {' '}{Math.abs(evolutionPanierAnalyse).toFixed(1)} %
  {' '}vs période précédente
</small>
  </div>

  <div className="carte-indicateur-analyse">
    <span>🥞 Produits vendus</span>
    <strong>{quantiteProduitsAnalyse}</strong>
  </div>

</div>
<div className="top-produits-analyse">

  <h2>🏆 Top 5 des produits</h2>

  {classementProduitsAnalyse.length === 0 ? (
    <p>Aucune vente sur cette période.</p>
  ) : (
    <div className="liste-top-produits">

      {classementProduitsAnalyse.map((produit, index) => (
        <div
          className="ligne-top-produit"
          key={produit.nom}
        >
          <span>{index + 1}.</span>
          <strong>{produit.nom}</strong>
          <span>{produit.quantite} vendus</span>
        </div>
      ))}

    </div>
  )}

</div>
<div className="paiements-analyse">

  <h2>💳 Répartition des paiements</h2>

  <div>
    <span>Carte</span>
    <strong>{chiffreAffairesCarteAnalyse.toFixed(2)} $</strong>
  </div>

  <div>
    <span>Espèces</span>
    <strong>{chiffreAffairesEspecesAnalyse.toFixed(2)} $</strong>
  </div>

</div>
<div className="commandes-jour-analyse">

  <h2>
  📅 Commandes {periodeAnalyse === 'semaine'
    ? 'par jour'
    : periodeAnalyse === 'mois'
      ? 'par semaine'
      : 'par mois'}
</h2>

  {commandesParJourAnalyse.length === 0 ? (
    <p>Aucune commande sur cette période.</p>
  ) : (
    <div className="liste-commandes-jour">

      {(
  periodeAnalyse === 'annee'
    ? graphiqueCAAfficheAnalyse
    : periodeAnalyse === 'mois'
      ? graphiqueCAAnalyse
      : commandesParJourAnalyse
).map(jour => {
  const date = new Date(
    (periodeAnalyse === 'semaine' ? jour.date : jour.periode) +
    'T12:00:00'
  )

  const libelle =
    periodeAnalyse === 'annee'
      ? date.toLocaleDateString('fr-FR', { month: 'long' })
      : periodeAnalyse === 'mois'
        ? (() => {
            const fin = new Date(date)
            fin.setDate(fin.getDate() + 6)

            const format = d =>
              d.toLocaleDateString('fr-FR', {
                day: '2-digit',
                month: '2-digit',
              })

            return `${format(date)} – ${format(fin)}`
          })()
        : date.toLocaleDateString('fr-FR', {
            weekday: 'short',
            day: '2-digit',
            month: '2-digit',
          })

  return (
    <div
      className="ligne-commandes-jour"
      key={periodeAnalyse === 'semaine' ? jour.date : jour.periode}
    >
      <strong>{libelle}</strong>

      <span>
        {periodeAnalyse === 'semaine'
          ? jour.nombreCommandes
          : commandesPeriodeAnalyse.filter(commande => {
              const d = new Date(commande.created_at)

              if (periodeAnalyse === 'annee') {
                return (
                  d.getFullYear() === date.getFullYear() &&
                  d.getMonth() === date.getMonth()
                )
              }

              const fin = new Date(date)
              fin.setDate(fin.getDate() + 7)

              return d >= date && d < fin
            }).length
        } commandes
      </span>
    </div>
  )
})}

    </div>
  )}

</div>
<div className="panier-jour-analyse">

  <h2>
  🛒 Panier moyen {periodeAnalyse === 'semaine'
    ? 'par jour'
    : periodeAnalyse === 'mois'
      ? 'par semaine'
      : 'par mois'}
</h2>

  {panierMoyenParJourAnalyse.length === 0 ? (
    <p>Aucune donnée disponible.</p>
  ) : (
    <div className="liste-panier-jour">

      {(
  periodeAnalyse === 'semaine'
    ? panierMoyenParJourAnalyse
    : graphiqueCAAfficheAnalyse.map(jour => {
        const date = new Date(jour.periode + 'T12:00:00')

        const commandesCorrespondantes =
          commandesPeriodeAnalyse.filter(commande => {
            const d = new Date(commande.created_at)

            if (periodeAnalyse === 'annee') {
              return (
                d.getFullYear() === date.getFullYear() &&
                d.getMonth() === date.getMonth()
              )
            }

            const fin = new Date(date)
            fin.setDate(fin.getDate() + 7)

            return d >= date && d < fin
          })

        const chiffreAffaires = commandesCorrespondantes.reduce(
          (total, commande) => total + Number(commande.total || 0),
          0
        )

        return {
          ...jour,
          panierMoyen:
            commandesCorrespondantes.length > 0
              ? chiffreAffaires / commandesCorrespondantes.length
              : 0,
        }
      })
).map(jour => {
  const date = new Date(
    (periodeAnalyse === 'semaine' ? jour.date : jour.periode) +
    'T12:00:00'
  )

  const libelle =
    periodeAnalyse === 'annee'
      ? date.toLocaleDateString('fr-FR', { month: 'long' })
      : periodeAnalyse === 'mois'
        ? (() => {
            const fin = new Date(date)
            fin.setDate(fin.getDate() + 6)

            const format = d =>
              d.toLocaleDateString('fr-FR', {
                day: '2-digit',
                month: '2-digit',
              })

            return `${format(date)} – ${format(fin)}`
          })()
        : date.toLocaleDateString('fr-FR', {
            weekday: 'short',
            day: '2-digit',
            month: '2-digit',
          })

  return (
    <div
      className="ligne-panier-jour"
      key={periodeAnalyse === 'semaine' ? jour.date : jour.periode}
    >
      <strong>{libelle}</strong>
      <span>{jour.panierMoyen.toFixed(2)} $</span>
    </div>
  )
})}

    </div>
  )}

</div>
<div className="graphique-ca-analyse">

  <h2>
  📈 Chiffre d'affaires {periodeAnalyse === 'semaine'
    ? 'par jour'
    : periodeAnalyse === 'mois'
      ? 'par semaine'
      : 'par mois'}
</h2>

  {graphiqueCAAnalyse.length === 0 ? (
    <p>Aucune donnée disponible.</p>
  ) : (
    <div className="liste-graphique-ca">

      
{graphiqueCAAfficheAnalyse.map(jour => {
  const libelle = periodeAnalyse === 'annee'
    ? new Date(jour.periode + '-01T12:00:00')
        .toLocaleDateString('fr-FR', { month: 'long' })
    : periodeAnalyse === 'mois'
      ? (() => {
          const debut = new Date(jour.periode + 'T12:00:00')
          const fin = new Date(debut)
          fin.setDate(fin.getDate() + 6)
          const format = date =>
            date.toLocaleDateString('fr-FR', {
              day: '2-digit',
              month: '2-digit',
            })
          return `${format(debut)} – ${format(fin)}`
        })()
      : new Date(jour.periode + 'T12:00:00')
          .toLocaleDateString('fr-FR', {
            weekday: 'short',
            day: '2-digit',
            month: '2-digit',
          })

  const maximum = Math.max(
    ...graphiqueCAAnalyse.map(item => item.chiffreAffaires),
    1
  )

  return (
    <div className="ligne-graphique-ca" key={jour.periode}>
      <div className="entete-barre-ca">
        <span>{libelle}</span>
        <strong>{jour.chiffreAffaires.toFixed(2)} $</strong>
      </div>

      <div className="barre-ca-fond">
        <div
          className="barre-ca-remplissage"
          style={{
            width: `${jour.chiffreAffaires / maximum * 100}%`,
          }}
        />
      </div>
    </div>
  )
})}

    </div>
  )}

</div>
  </div>
) : admin ? (
  <Admin
    produits={menu}
    ajouterProduit={ajouterNouveauProduit}
    modifierProduit={modifierProduit}
    supprimerProduit={supprimerProduitDuMenu}
    reordonnerProduits={reordonnerProduits}
    basculerVisibiliteProduit={basculerVisibiliteProduit}
    supplements={supplements}
    ajouterSupplement={ajouterSupplement}
    modifierSupplement={modifierSupplement}
    supprimerSupplement={supprimerSupplement}
    retourAccueil={() => {
      setAdmin(false)
      setAccueil(true)
      setCreationEvenement(true)
    }}
  />
) : cuisine ? (
  <Cuisine
  commandes={commandesEvenement}
  changerStatut={changerStatut}
/>
) : historiqueCommandesActif ? (
  <div className="historique-commandes-actif">


<h1>🧾 Commandes</h1>

<h2>{evenement?.nom}</h2>

<div className="resume-commandes-actif">

  <div>
    <span>🧾 Commandes</span>
    <strong>
      {commandesEvenement.length}
    </strong>
  </div>

  <div>
    <span>💰 Total</span>
    <strong>
      {totalEvenement.toFixed(2)} $
    </strong>
  </div>

</div>

{commandesEvenement.length === 0 ? (
      <p>Aucune commande pour le moment.</p>
    ) : (
      <div className="liste-commandes-historique">

        {[...commandesEvenement].reverse().map((commande) => (
          <div
            className="carte-commande-historique"
            key={commande.id}
          >

            
<div className="entete-commande-historique">

  
<div className="infos-ticket-historique">
  <span className="ticket-historique">
    Ticket : {commande.numeroTicket ?? '—'}
  </span>
  <strong>
    Commande #{commande.numero}
  </strong>
</div>


  <div className="actions-commande">

  <div className="boutons-actions-commande">


<button
  type="button"
  title="Modifier la commande"
  className="bouton-action-commande"
  aria-label="Modifier la commande"
  onClick={() => {
    console.log("CHARGEMENT DE LA COMMANDE", commande)

    setCommandeEnModification(commande)

    setCommandesEnCours((anciensPaniers) => ({
      ...anciensPaniers,
      [evenement.id]: commande.articles.map((article) => ({
        ...article,
      })),
    }))

    setAccueil(false)
    setCuisine(false)
    setHistorique(false)
    setHistoriqueCommandesActif(false)
    setAdmin(false)
  }}
>
  ✏️
</button>



<button
  type="button"
  className="bouton-action-commande bouton-supprimer-commande"
  title="Supprimer la commande"
  aria-label="Supprimer la commande"
  onClick={() => supprimerCommande(commande)}
>
  🗑️
</button>
  </div>
  </div>
</div>


            <div className="details-commande-historique">

              {commande.articles.map((article) => (
                <div
                  className="article-historique"
                  key={article.id}
                >

                  <div className="article-historique-principal">

                    <span>
                      {article.quantite} ×
                    </span>

                    <strong>
                      {article.nom}
                    </strong>

                  </div>

                  {article.personnalise && (
                    <div className="personnalisation-historique">

                      {article.ingredientsRetires?.map(
                        (ingredient, index) => (
                          <div key={`retire-${index}`}>
                            Sans {ingredient.nom}
                          </div>
                        )
                      )}

                      {article.supplements?.map(
                        (supplement) => (
                          <div
                            key={`supplement-${supplement.id}`}
                          >
                            + {supplement.nom}
                          </div>
                        )
                      )}

                    </div>
                  )}

                </div>
              ))}

            </div>

            <div className="pied-commande-historique">

  <span>
    {Number(commande.montantCarte ?? 0) > 0 &&
    Number(commande.montantEspeces ?? 0) > 0
      ? `Espèces : ${Number(commande.montantEspeces).toFixed(2)} $ | Carte : ${Number(commande.montantCarte).toFixed(2)} $`
      : commande.modePaiement}
  </span>

  <span>
    Total : {Number(commande.total).toFixed(2)} $
  </span>

</div>

          </div>
        ))}

      </div>
    )}

  </div>
) : (

          <main>

            <section className="menu">

              <div className="categories">

                <button
                  className={
                    categorie === 'Sweet'
                      ? 'active'
                      : ''
                  }
                  onClick={() =>
                    setCategorie('Sweet')
                  }
                >
                  🥞 Sweet
                </button>

                <button
                  className={
                    categorie === 'Savoury'
                      ? 'active'
                      : ''
                  }
                  onClick={() =>
                    setCategorie('Savoury')
                  }
                >
                  🥞 Savoury
                </button>

              </div>

              <div className="produits">

{produitsAffiches.map((produit) => (

<div
  key={produit.id}
  className={`produit ${
    produit.categorie === 'Savoury'
      ? produit.typeRecette === 'viande'
        ? 'produit-viande'
        : 'produit-vege'
      : ''
  }`}
  style={
    produit.categorie === 'Sweet'
      ? {
          backgroundColor:
            produit.couleur || '#F6D6DC',
          color:
            ['#2d2d2d', '#6c442b', '#a3612f', '#d0863bc5'].includes(
              produit.couleur
            )
              ? '#FFFFFF'
              : '#333333',
        }
      : undefined
  }
  onClick={() => ajouterProduit(produit)}
>
  <strong>
    {produit.nom}
  </strong>

  <span>
    {Number(produit.prix).toFixed(2)} $
  </span>

  <div className="actions-produit">
    <button
      className="personnaliser-produit"
      onClick={(e) => {
        e.stopPropagation()
        setProduitPersonnalise(produit)
      }}
    >
      ✏️
    </button>
  </div>
</div>
                ))}

              </div>

            </section>

            <aside className="panier">

<div className="zone-commande" ref={zoneCommandeRef}>
<div className="titre-panier">
  <h2>Commande</h2>

  <button
    className="corbeille-panier"
    onClick={() => {
  if (!evenement) {
    return
  }

  setCommandesEnCours((anciensPaniers) => ({
    ...anciensPaniers,
    [evenement.id]: [],
  }))
}}
    disabled={panierActuel.length === 0}
  >
    🗑️
  </button>
</div>

{(commandeEnModification?.numeroTicket ?? prochainTicket) !== null && (
  <div className="ticket-panier">
    Ticket : <strong>
      {commandeEnModification?.numeroTicket ?? prochainTicket}
    </strong>
  </div>
)}
              <div className="articles">

                {panierActuel.length === 0 ? (
                  <p className="vide">
                    Aucun article
                  </p>

                ) : (

                  panierActuel.map((article) => (

                    <div
  className="article"
  key={article.id}
>

  <div className="ligne-article">

    <strong>
      {article.nom}
    </strong>

    <div className="quantite">

      <button
        onClick={() =>
          diminuerProduit(article.id)
        }
      >
        −
      </button>

      <span>
        {article.quantite}
      </span>

      <button
        onClick={() =>
          ajouterProduit(article)
        }
      >
        +
      </button>

      <button
        className="supprimer"
        onClick={() =>
          supprimerProduit(article.id)
        }
      >
        ✕
      </button>

    </div>

    <span className="prix-article">
      {(
        Number(article.prix) *
        article.quantite
      ).toFixed(2)} $
    </span>

  </div>

  {article.personnalise && (
    <div className="composition-panier">

      {article.ingredientsRetires?.map(
        (ingredient, index) => (
          <span
            key={`retire-${index}`}
          >
            Sans {ingredient.nom}
          </span>
        )
      )}

      {article.supplements?.map(
        (supplement) => (
          <span
            key={`supplement-${supplement.id}`}
          >
            + {supplement.nom}
          </span>
        )
      )}

    </div>
  )}

</div>

                  ))

                )}

              </div>

<div
  ref={actionsPanierRef}
  className={`actions-panier panier-fixe-mobile ${
  recapVisible ? 'recap-visible' : ''
}`}
  data-recap-visible={String(recapVisible)}
  
>



  <div className="total">

    <span>Total</span>

    
<strong key={total.toFixed(2)}>
  {total.toFixed(2)} $
</strong>


  </div>



<button
  className="bouton-payer"
  onClick={async () => {
    if (panierActuel.length === 0) return

    if (commandeEnModification) {
      const nouveauTotal = panierActuel.reduce(
        (somme, article) =>
          somme + Number(article.prix) * Number(article.quantite),
        0
      )

      const { data, error } = await supabase
        .from('commandes')
        .update({
          articles: panierActuel,
          total: nouveauTotal,
        })
        .eq('id', commandeEnModification.id)
        .select()
        .single()

      if (error) {
        console.error(
          'Erreur lors de la modification de la commande :',
          error
        )
        alert('Impossible d’enregistrer les modifications.')
        return
      }

      const commandeMiseAJour = {
        id: data.id,
        evenementId: data.evenement_id,
        numero: data.numero,
        numeroTicket: data.numero_ticket,
        articles: data.articles,
        total: data.total,
        modePaiement: data.mode_paiement,
        statut: data.statut,
      }

      setCommandes((anciennesCommandes) =>
        anciennesCommandes.map((commande) =>
          String(commande.id) === String(commandeMiseAJour.id)
            ? commandeMiseAJour
            : commande
        )
      )

      setCommandesEnCours((anciensPaniers) => ({
        ...anciensPaniers,
        [evenement.id]: [],
      }))

      setCommandeEnModification(null)
      alert('Modifications enregistrées !')
      return
    }

    setPaiement(true)
  }}
  disabled={panierActuel.length === 0}
>
  {commandeEnModification
    ? '💾 ENREGISTRER'
    : '💳 PAYER'}
</button>


</div>

</div>

<div className="recap-evenement" ref={finPanierRef}>


  <h3>📊 Récapitulatif de l'événement</h3>
  <div className="evenement-recap-infos">
  <strong>{evenement?.nom}</strong>
  <span>{evenement?.date}</span>
</div>

  <div className="ligne-recap">
    <span>Total des ventes</span>
    <strong>
      {totalEvenement.toFixed(2)} $
    </strong>
  </div>

  <div className="ligne-recap">
    <span>💳 Carte</span>
    <strong>
      {totalCarte.toFixed(2)} $
    </strong>
  </div>

  <div className="ligne-recap">
    <span>💵 Espèces</span>
    <strong>
      {totalCash.toFixed(2)} $
    </strong>
  </div>

<div className="ligne-recap">
  <span>🥞 Sweet</span>
  <strong>
    {commandesEvenement.reduce(
      (total, commande) =>
        total +
        (commande.articles || []).reduce(
          (nombre, article) =>
            nombre +
            (article.categorie === 'Sweet'
              ? Number(article.quantite || 1)
              : 0),
          0
        ),
      0
    )}
  </strong>
</div>

<div className="ligne-recap">
  <span>🧀 Savoury</span>
  <strong>
    {commandesEvenement.reduce(
      (total, commande) =>
        total +
        (commande.articles || []).reduce(
          (nombre, article) =>
            nombre +
            (article.categorie === 'Savoury'
              ? Number(article.quantite || 1)
              : 0),
          0
        ),
      0
    )}
  </strong>
</div>

</div>
<button
  type="button"
  className="bouton-terminer-evenement"
onClick={async () => {
  const confirmer = window.confirm(
    'Terminer cet événement ? Les commandes seront conservées dans l’historique.'
  )

  if (confirmer) {
  const { error } = await supabase
    .from('evenements')
    .update({
      statut: 'Terminé',
    })
    .eq('id', evenement.id)

  if (error) {
    console.error(
      'Erreur lors de la terminaison de l’événement :',
      error
    )
    return
  }
    setHistoriqueEvenements((anciensEvenements) => [
      ...anciensEvenements,
      {
        ...evenement,
        commandes: commandesEvenement,
      },
    ])

    setCommandesEnCours((anciensPaniers) => {
      const nouveauxPaniers = {
        ...anciensPaniers,
      }

      delete nouveauxPaniers[evenement.id]

      return nouveauxPaniers
    })

 const autresEvenements =
  evenementsActifs.filter(
    (evenementActif) =>
      evenementActif.id !== evenement.id
  )

setEvenementsActifs(autresEvenements)

if (autresEvenements.length > 0) {
  setEvenement(autresEvenements[0])
  setCreationEvenement(false)
} else {
  setEvenement(null)
  setCreationEvenement(true)
}

setAccueil(true)
setAdmin(false)
setCuisine(false)
setHistorique(false)
setHistoriqueCommandesActif(false)
  }
}}
>
  🏁 Terminer l'événement
</button>

            </aside>
{produitPersonnalise && (
  <PersonnaliserProduits
    produit={produitPersonnalise}
    supplements={
  produitPersonnalise.categorie === 'Sweet'
    ? supplements.Sweet
    : supplements.Savoury
}
    fermer={() => setProduitPersonnalise(null)}
    ajouterCommande={ajouterProduit}
  />
)}

{paiement && (

  <div className="paiement-overlay">

    <div className="paiement">

      <h2 className="titre-paiement">
        <span className="emoji-paiement">💳</span>
        <span>Paiement</span>
      </h2>

      <p>Total à payer</p>

      <div className="montant-paiement">
        {total.toFixed(2)} $
      </div>

      <div className="modes-paiement">

        <button
          className={
            modePaiement === 'Carte'
              ? 'active'
              : ''
          }
          onClick={() => {
            setModePaiement('Carte')
            setCompleterEnCarte(false)
          }}
        >
          💳 Carte
        </button>

        <button
          className={
            modePaiement === 'Espèces'
              ? 'active'
              : ''
          }
          onClick={() => setModePaiement('Espèces')}
        >
          💵 Espèces
        </button>

      </div>

      {modePaiement === 'Espèces' && (

        <div className="especes">

          <label>
            Montant reçu
          </label>

          <input
            type="number"
            inputMode="decimal"
            step="0.10"
            min={completerEnCarte ? 0 : total}
            max={completerEnCarte ? total : undefined}
            value={montantRecu}
            onChange={(e) =>
              setMontantRecu(e.target.value)
            }
            placeholder="0.00"
          />

          <button
            type="button"
            className="montant-exact"
            onClick={() =>
              setMontantRecu(total.toFixed(2))
            }
          >
            ⚡ Montant exact
          </button>

          <button
            type="button"
            className={`montant-exact ${completerEnCarte ? 'active' : ''}`}
            onClick={() =>
              setCompleterEnCarte(!completerEnCarte)
            }
          >
            💳 Compléter en carte
          </button>

          {completerEnCarte && (
            <p>
              Reste à payer par carte :
              <strong>
                {' '}
                {Math.max(
                  0,
                  total - Math.max(0, Number(montantRecu) || 0)
                ).toFixed(2)} $
              </strong>
            </p>
          )}

          {!completerEnCarte && Number(montantRecu) >= total && (

            <p>
              Monnaie à rendre :
              <strong>
                {' '}
                {(
                  Number(montantRecu) - total
                ).toFixed(2)} $
              </strong>
            </p>

          )}

        </div>

      )}

      {modePaiement && (
        <button
          className="confirmer-paiement"
          onClick={enregistrerPaiement}
          disabled={
            paiementEnregistrement ||
            (modePaiement === 'Espèces' &&
              !completerEnCarte &&
              Number(montantRecu) < total)
          }
        >
          {paiementEnregistrement
            ? '⏳ Enregistrement...'
            : '✅ Enregistrer le paiement'}
        </button>
      )}

      <button
        className="annuler-paiement"
        onClick={() => {
          setPaiement(false)
          setModePaiement('')
          setMontantRecu('')
          setCompleterEnCarte(false)
        }}
      >
        Annuler
      </button>

    </div>

  </div>
)}

</main>
          )}
        </>
      )}
    </>
  )}
  </div>
  )
}

export default App