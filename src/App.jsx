import { useState, useEffect } from 'react'
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


function App() {
  console.log('APP.jsx CHARGÉ')
useEffect(() => {
  const chargerSession = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession()

    setSession(session)
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
  if (!session) {
    return
  }

  const chargerEvenements = async () => {
    const { data, error } = await supabase
      .from('evenements')
      .select('*')
      .eq('statut', 'En cours')
      .order('date', { ascending: false })

    if (error) {
      console.error(
        'Erreur lors du chargement des événements :',
        error
      )
      setChargementEvenements(false)
      return
    }

    setEvenementsActifs(data || [])

    if (data && data.length > 0) {
      const evenementSauvegarde = data.find(
        (evenementActif) =>
          String(evenementActif.id) ===
          String(evenementSelectionneId)
      )

      if (evenementSauvegarde) {
        setEvenement(evenementSauvegarde)
        setAccueil(false)
        setCreationEvenement(false)
      } else {
        setEvenement(data[0])
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
useEffect(() => {
  console.log('ÉTAT ÉCRAN :', {
    session: !!session,
    accueil,
    evenement,
    chargementEvenements,
    creationEvenement,
  })
}, [
  session,
  accueil,
  evenement,
  chargementEvenements,
  creationEvenement,
])
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
          .map((commande) => ({
            id: commande.id,
            evenementId: commande.evenement_id,
            numero: commande.numero,
            articles: commande.articles,
            total: commande.total,
            modePaiement: commande.mode_paiement,
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

  chargerHistorique()
}, [])
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
                (data || []).map((commande) => ({
                  id: commande.id,
                  evenementId: commande.evenement_id,
                  numero: commande.numero,
                  articles: commande.articles,
                  total: commande.total,
                  modePaiement: commande.mode_paiement,
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
        articles: commande.articles,
        total: commande.total,
        modePaiement: commande.mode_paiement,
        statut: commande.statut,
      })
    )

setCommandes(commandesSupabase)

    console.log(
      'Commandes chargées depuis Supabase :',
      commandesSupabase
    )
  }

  chargerCommandes()
}, [])

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
          articles: commande.articles,
          total: commande.total,
          modePaiement: commande.mode_paiement,
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
                ancienneCommande.id ===
                nouvelleCommande.id
                  ? nouvelleCommande
                  : ancienneCommande
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

  chargerSupplements()
}, [])
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
const [historiqueEvenements, setHistoriqueEvenements] =
  useState([])
const [evenement, setEvenement] = useState(null)
const [chargementEvenements, setChargementEvenements] = useState(true)
const [session, setSession] = useState(null)
const [emailConnexion, setEmailConnexion] = useState('')
const [motDePasseConnexion, setMotDePasseConnexion] =
  useState('')
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
const [admin, setAdmin] = useState(false)
const [cuisine, setCuisine] = useState(false)
const [historique, setHistorique] = useState(false)
const [accueil, setAccueil] = useState(true)
const [historiqueCommandesActif, setHistoriqueCommandesActif] = useState(false)
const [paiement, setPaiement] = useState(false)
const [modePaiement, setModePaiement] = useState('')
const [montantRecu, setMontantRecu] = useState('')
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
      })
    )

    setMenu(produitsSupabase)

    console.log(
      'Produits chargés depuis Supabase :',
      produitsSupabase
    )
  }

  chargerProduits()
}, [])
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

const modifierProduit = async (produitModifie) => {
  const { data, error } = await supabase
    .from('produits')
    .update({
      nom: produitModifie.nom,
      prixMarche: produitModifie.prixMarche,
      prixEvenement: produitModifie.prixEvenement,
      categorie: produitModifie.categorie,
      typeRecette: produitModifie.typeRecette,
      ingredients: produitModifie.ingredients,
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
const commandesEvenement = commandes.filter(
  (item) =>
    String(item.evenementId) ===
    String(evenement?.id)
)
const totalEvenement = commandesEvenement.reduce(
  (somme, commande) =>
    somme + Number(commande.total),
  0
)

const totalCarte = commandesEvenement
  .filter((commande) => commande.modePaiement === 'Carte')
  .reduce(
    (somme, commande) =>
      somme + Number(commande.total),
    0
  )

const totalCash = commandesEvenement
  .filter((commande) => commande.modePaiement === 'Espèces')
  .reduce(
    (somme, commande) =>
      somme + Number(commande.total),
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
    if (!modePaiement) {
      return
    }

    if (
      modePaiement === 'Espèces' &&
      Number(montantRecu) < total
    ) {
      return
    }

const numeroCommande = String(
  commandes.filter(
    (item) => item.evenementId === evenement.id
  ).length + 1
).padStart(3, '0')

const { data, error } = await supabase
  .from('commandes')
  .insert({
    evenement_id: evenement.id,
    numero: numeroCommande,
    articles: panierActuel,
    total: total,
    mode_paiement: modePaiement,
    statut: 'Nouvelle',
  })
  .select()
  .single()

if (error) {
  console.error(
    'Erreur lors de l’enregistrement de la commande :',
    error
  )
  return
}

const nouvelleCommande = {
  id: data.id,
  evenementId: data.evenement_id,
  numero: data.numero,
  articles: data.articles,
  total: data.total,
  modePaiement: data.mode_paiement,
  statut: data.statut,
}

setCommandes((anciennesCommandes) => [
  ...anciennesCommandes,
  nouvelleCommande,
])

    setCommandesEnCours((anciensPaniers) => ({
  ...anciensPaniers,
  [evenement.id]: [],
}))
    setPaiement(false)
    setModePaiement('')
    setMontantRecu('')
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

const produitsAffiches = menu
  .filter(
    (produit) => produit.categorie === categorie
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

const totalHistorique =
  commandesHistorique.reduce(
    (somme, commande) =>
      somme + Number(commande.total),
    0
  )

const totalCarteHistorique =
  commandesHistorique
    .filter(
      (commande) =>
        commande.modePaiement === 'Carte'
    )
    .reduce(
      (somme, commande) =>
        somme + Number(commande.total),
      0
    )

const totalCashHistorique =
  commandesHistorique
    .filter(
      (commande) =>
        commande.modePaiement === 'Espèces'
    )
    .reduce(
      (somme, commande) =>
        somme + Number(commande.total),
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
return (
  <div className="app">
    {!session ? (
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
      <div className="carte-evenement">
        <h2>Chargement...</h2>
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

  {produitsVendusHistorique.length === 0 ? (
    <p>Aucun produit vendu</p>
  ) : (
    produitsVendusHistorique.map(
      ([nom, quantite]) => (
        <div
          className="ligne-produit-vendu"
          key={nom}
        >
          <span>{nom}</span>
          <strong>×{quantite}</strong>
        </div>
      )
    )
  )}

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

              <strong>
                #{commande.numero}
              </strong>

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
                {commande.modePaiement}
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

            {historiqueEvenements
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
.reverse()
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

console.log(
  'ÉVÉNEMENT SUPPRIMÉ SUPABASE :',
  evenementSupprime
)

if (erreurEvenement) {
  console.error(
    'Erreur lors de la suppression de l’événement :',
    erreurEvenement
  )
  return
}

    if (erreurEvenement) {
      console.error(
        'Erreur lors de la suppression de l’événement :',
        erreurEvenement
      )
      return
    }

    setHistoriqueEvenements(
      (anciensEvenements) =>
        anciensEvenements.filter(
          (evenement) =>
            evenement.id !== ancienEvenement.id
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
{!admin && (
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
        {admin ? (
          <Admin
  produits={menu}
  ajouterProduit={ajouterNouveauProduit}
  modifierProduit={modifierProduit}
  supprimerProduit={supprimerProduitDuMenu}
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

        {commandesEvenement.map((commande) => (
          <div
            className="carte-commande-historique"
            key={commande.id}
          >

            <div className="entete-commande-historique">

              <strong>
                #{commande.numero}
              </strong>

              <span>
                {Number(commande.total).toFixed(2)} $
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
                {commande.modePaiement}
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

 <div className="actions-panier">

  <div className="total">

    <span>Total</span>

    <strong>
      {total.toFixed(2)} $
    </strong>

  </div>


  <button
  className="bouton-payer"
  onClick={() => {
    if (panierActuel.length > 0) {
      setPaiement(true)
    }
  }}
  disabled={panierActuel.length === 0}
>
  💳 PAYER
</button>

</div>
<div className="recap-evenement">

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
      {totalSweet.toFixed(2)} $
    </strong>
  </div>

  <div className="ligne-recap">
    <span>🧀 Savoury</span>
    <strong>
      {totalSavoury.toFixed(2)} $
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
                      onClick={() =>
                        setModePaiement('Carte')
                      }
                    >
                      💳 Carte
                    </button>

                    <button
                      className={
                        modePaiement === 'Espèces'
                          ? 'active'
                          : ''
                      }
                      onClick={() =>
                        setModePaiement('Espèces')
                      }
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
  min={total}
  value={montantRecu}
  onChange={(e) =>
    setMontantRecu(e.target.value)
  }
  placeholder="0.00"
/>

                      {Number(montantRecu) >= total && (

                        <p>
                          Monnaie à rendre :
                          <strong>
                            {' '}
                            {(
                              Number(montantRecu) -
                              total
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
    modePaiement === 'Espèces' &&
    Number(montantRecu) < total
  }
>
  ✅ Enregistrer le paiement
</button>

                  )}

                  <button
                    className="annuler-paiement"
                    onClick={() => {
                      setPaiement(false)
                      setModePaiement('')
                      setMontantRecu('')
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

     {produitPersonnalise && (
      <PersonnaliserProduits
        produit={produitPersonnalise}
        supplements={
          produitPersonnalise.categorie === 'Sweet'
            ? supplements.Sweet
            : supplements.Savoury
        }
        fermer={() =>
          setProduitPersonnalise(null)
        }
        ajouterCommande={(produit) => {
          ajouterProduit(produit)
          setProduitPersonnalise(null)
        }}
      />
    )}

    </>
    )}
  </div>
  )
}

export default App