import { useState } from 'react'

function Admin({
  produits,
  ajouterProduit,
  modifierProduit,
  supprimerProduit,
  supplements,
  ajouterSupplement,
  modifierSupplement,
  supprimerSupplement,
  retourAccueil,
}) {
  const [nom, setNom] = useState('')
  const [prixMarche, setPrixMarche] = useState('')
const [prixEvenement, setPrixEvenement] = useState('')
  const [categorie, setCategorie] = useState('Sweet')
  const [typeRecette, setTypeRecette] = useState('vege')
  const [tarifActif, setTarifActif] =
  useState('marche')
  const [ingredients, setIngredients] = useState([])

  const [nomIngredient, setNomIngredient] = useState('')
  const [prixIngredient, setPrixIngredient] = useState('')

  const [nomSupplement, setNomSupplement] = useState('')
  const [prixSupplement, setPrixSupplement] = useState('')
  const [categorieSupplement, setCategorieSupplement] =
    useState('Sweet')

  const [produitEnModification, setProduitEnModification] =
    useState(null)

  const [supplementEnModification, setSupplementEnModification] =
    useState(null)
  const [categorieActive, setCategorieActive] =
  useState('Sweet')
  const [
  categorieSupplementActive,
  setCategorieSupplementActive,
] = useState('Sweet')

  // =========================
  // MODIFIER PRODUIT
  // =========================

  const commencerModification = (produit) => {
    setProduitEnModification(produit)
    setNom(produit.nom)
setPrixMarche(produit.prixMarche)
setPrixEvenement(produit.prixEvenement)
setCategorie(produit.categorie)
setTypeRecette(produit.typeRecette ?? 'vege')
    setIngredients(produit.ingredients || [])
    setSupplementEnModification(null)

    setTimeout(() => {
      document
        .getElementById('formulaire-produit')
        ?.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
        })
    }, 100)
  }

  const annulerModification = () => {
    setProduitEnModification(null)
    setNom('')
setPrixMarche('')
setPrixEvenement('')
setCategorie('Sweet')
    setIngredients([])
    setNomIngredient('')
    setPrixIngredient('')
  }

  // =========================
  // INGREDIENTS
  // =========================

  const ajouterIngredient = () => {
    if (!nomIngredient || !prixIngredient) {
      return
    }

    setIngredients([
      ...ingredients,
      {
        nom: nomIngredient,
        prix: Number(prixIngredient),
      },
    ])

    setNomIngredient('')
    setPrixIngredient('')
  }

  const supprimerIngredient = (index) => {
    setIngredients(
      ingredients.filter((_, ingredientIndex) => {
        return ingredientIndex !== index
      })
    )
  }

  // =========================
  // ENREGISTRER PRODUIT
  // =========================

  const enregistrer = (e) => {
    e.preventDefault()

if (!nom) {
  return
}

if (
  tarifActif === 'marche' &&
  !prixMarche
) {
  return
}

if (
  tarifActif === 'evenement' &&
  !prixEvenement
) {
  return
}

    if (produitEnModification) {
  modifierProduit({
    ...produitEnModification,
    nom: nom,
    prixMarche:
      tarifActif === 'marche'
        ? Number(prixMarche)
        : produitEnModification.prixMarche,
    prixEvenement:
      tarifActif === 'evenement'
        ? Number(prixEvenement)
        : produitEnModification.prixEvenement,
    categorie: categorie,
    ingredients: ingredients,
  })

  annulerModification()
}else {
ajouterProduit({
  id: Date.now(),
  nom: nom,
  prixMarche:
    prixMarche !== ''
      ? Number(prixMarche)
      : Number(prixEvenement),
  prixEvenement:
    prixEvenement !== ''
      ? Number(prixEvenement)
      : Number(prixMarche),
 categorie: categorie,
typeRecette: typeRecette,
ingredients: ingredients,
})

      setNom('')
setPrixMarche('')
setPrixEvenement('')
setCategorie('Sweet')
      setIngredients([])
      setNomIngredient('')
      setPrixIngredient('')
    }
  }

  // =========================
  // MODIFIER SUPPLEMENT
  // =========================

  const commencerModificationSupplement = (
    supplement,
    categorie
  ) => {
    setSupplementEnModification({
      ...supplement,
      categorie: categorie,
    })

    setNomSupplement(supplement.nom)
    setPrixSupplement(supplement.prix)
    setCategorieSupplement(categorie)
    setProduitEnModification(null)

    setTimeout(() => {
      document
        .getElementById('formulaire-supplement')
        ?.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
        })
    }, 100)
  }

  const annulerModificationSupplement = () => {
    setSupplementEnModification(null)
    setNomSupplement('')
    setPrixSupplement('')
    setCategorieSupplement('Sweet')
  }

  // =========================
  // ENREGISTRER SUPPLEMENT
  // =========================

  const enregistrerSupplement = (e) => {
    e.preventDefault()

    if (!nomSupplement || !prixSupplement) {
      return
    }

    if (supplementEnModification) {
      modifierSupplement({
        ...supplementEnModification,
        nom: nomSupplement,
        prix: Number(prixSupplement),
        categorie: categorieSupplement,
      })

      annulerModificationSupplement()
    } else {
      ajouterSupplement({
        id: Date.now(),
        nom: nomSupplement,
        prix: Number(prixSupplement),
        categorie: categorieSupplement,
      })

      setNomSupplement('')
      setPrixSupplement('')
    }
  }

  return (
    <div className="admin">

      <div className="titre-administration">

  <button
    type="button"
    className="retour-administration"
    onClick={retourAccueil}
  >
    ⬅️
  </button>

  <h1> Administration</h1>

</div>
      <div className="onglets-tarifs-admin">

  <button
    type="button"
    className={
      tarifActif === 'marche'
        ? 'active'
        : ''
    }
    onClick={() =>
      setTarifActif('marche')
    }
  >
    🏪 Marché
  </button>

  <button
    type="button"
    className={
      tarifActif === 'evenement'
        ? 'active'
        : ''
    }
    onClick={() =>
      setTarifActif('evenement')
    }
  >
    🎪 Événement
  </button>

</div>

      {/* =========================
          PRODUITS ACTUELS
      ========================= */}

      <h2>Produits actuels</h2>
      <div className="onglets-categories-admin">

  <button
    type="button"
    className={
      categorieActive === 'Sweet'
        ? 'active'
        : ''
    }
    onClick={() => setCategorieActive('Sweet')}
  >
    🍓 Sweet
  </button>

  <button
    type="button"
    className={
      categorieActive === 'Savoury'
        ? 'active'
        : ''
    }
    onClick={() => setCategorieActive('Savoury')}
  >
    🧀 Savoury
  </button>

</div>

      <div className="admin-produits">

        {produits
  .filter(
    (produit) =>
      produit.categorie === categorieActive
  )
  .map((produit) => (
          <div
            className="admin-produit"
            key={produit.id}
          >

            <div>
              <strong>{produit.nom}</strong>

              <span>
  {Number(
    tarifActif === 'marche'
      ? produit.prixMarche
      : produit.prixEvenement
  ).toFixed(2)} $
</span>

              <small>
                {produit.categorie}
              </small>
            </div>

            <div className="admin-actions">

              <button
                type="button"
                onClick={() =>
                  commencerModification(produit)
                }
              >
                ✏️
              </button>

              <button
                type="button"
                onClick={() =>
                  supprimerProduit(produit.id)
                }
              >
                🗑️
              </button>

            </div>

          </div>
        ))}

      </div>

      <hr />

      {/* =========================
          SUPPLEMENTS ACTUELS
      ========================= */}

      <h2>Suppléments actuels</h2>

<div className="admin-supplements">

  <div className="onglets-supplements-admin">

    <button
      type="button"
      className={
        categorieSupplementActive === 'Sweet'
          ? 'active'
          : ''
      }
      onClick={() =>
        setCategorieSupplementActive('Sweet')
      }
    >
      🍓 Sweet
    </button>

    <button
      type="button"
      className={
        categorieSupplementActive === 'Savoury'
          ? 'active'
          : ''
      }
      onClick={() =>
        setCategorieSupplementActive('Savoury')
      }
    >
      🧀 Savoury
    </button>

  </div>

  {supplements[categorieSupplementActive].map(
    (supplement) => (
      <div
        className="admin-produit"
        key={supplement.id}
      >

        <div>
          <strong>
            {supplement.nom}
          </strong>

          <span>
            +{Number(supplement.prix).toFixed(2)} $
          </span>
        </div>

        <div className="admin-actions">

          <button
            type="button"
            onClick={() =>
              commencerModificationSupplement(
                supplement,
                categorieSupplementActive
              )
            }
          >
            ✏️
          </button>

          <button
            type="button"
            onClick={() =>
              supprimerSupplement(
                supplement.id,
                categorieSupplementActive
              )
            }
          >
            🗑️
          </button>

        </div>

      </div>
    )
  )}

</div>

      <hr />

      {/* =========================
          NOUVEAU / MODIFIER PRODUIT
      ========================= */}

      <h2>
        {produitEnModification
          ? '✏️ Modifier un produit'
          : '➕ Nouveau produit'}
      </h2>

      <form
        id="formulaire-produit"
        onSubmit={enregistrer}
      >

        <input
          type="text"
          placeholder="Nom du produit"
          value={nom}
          onChange={(e) =>
            setNom(e.target.value)
          }
        />

 {tarifActif === 'marche' ? (
  <input
    type="number"
    placeholder="Prix marché"
    step="0.01"
    min="0"
    value={prixMarche}
    onChange={(e) =>
      setPrixMarche(e.target.value)
    }
  />
) : (
  <input
    type="number"
    placeholder="Prix événement"
    step="0.01"
    min="0"
    value={prixEvenement}
    onChange={(e) =>
      setPrixEvenement(e.target.value)
    }
  />
)}
        <select
          value={categorie}
          onChange={(e) =>
            setCategorie(e.target.value)
          }
        >
          <option value="Sweet">
            Sweet
          </option>

          <option value="Savoury">
            Savoury
          </option>
        </select>
        <div className="type-recette-admin">

  <label>Type de recette</label>

  <div className="choix-type-recette">

    <button
      type="button"
      className={
        typeRecette === 'viande'
          ? 'active viande'
          : ''
      }
      onClick={() => {
  setTypeRecette('viande')
}}
    >
      🥩 Viande
    </button>

    <button
      type="button"
      className={
        typeRecette === 'vege'
          ? 'active vege'
          : ''
      }
      onClick={() => {
  setTypeRecette('vege')
}}
    >
      🌱 Végé
    </button>

  </div>

</div>

        <h3>🥞 Ingrédients</h3>

        <div className="admin-ingredients">

          {ingredients.map((ingredient, index) => (
            <div
              className="admin-ingredient"
              key={index}
            >

              <span>
                {ingredient.nom}
              </span>

              <span>
                {Number(ingredient.prix).toFixed(2)} $
              </span>

              <button
                type="button"
                onClick={() =>
                  supprimerIngredient(index)
                }
              >
                🗑️
              </button>

            </div>
          ))}

        </div>

        <div className="ajouter-ingredient">

          <input
            type="text"
            placeholder="Nom de l'ingrédient"
            value={nomIngredient}
            onChange={(e) =>
              setNomIngredient(e.target.value)
            }
          />

          <input
            type="number"
            placeholder="Prix"
            step="0.01"
            min="0"
            value={prixIngredient}
            onChange={(e) =>
              setPrixIngredient(e.target.value)
            }
          />

          <button
            type="button"
            onClick={ajouterIngredient}
          >
            ➕ Ajouter l'ingrédient
          </button>

        </div>

        <button type="submit">
          {produitEnModification
            ? '💾 Enregistrer'
            : '➕ Ajouter le produit'}
        </button>

        {produitEnModification && (
          <button
            type="button"
            onClick={annulerModification}
          >
            Annuler
          </button>
        )}

      </form>

      <hr />

      {/* =========================
          NOUVEAU / MODIFIER SUPPLEMENT
      ========================= */}

      <h2>
        {supplementEnModification
          ? '✏️ Modifier un supplément'
          : '➕ Nouveau supplément'}
      </h2>

      <form
        id="formulaire-supplement"
        onSubmit={enregistrerSupplement}
      >

        <input
          type="text"
          placeholder="Nom du supplément"
          value={nomSupplement}
          onChange={(e) =>
            setNomSupplement(e.target.value)
          }
        />

        <input
          type="number"
          placeholder="Prix"
          step="0.01"
          min="0"
          value={prixSupplement}
          onChange={(e) =>
            setPrixSupplement(e.target.value)
          }
        />

        <select
          value={categorieSupplement}
          onChange={(e) =>
            setCategorieSupplement(e.target.value)
          }
        >
          <option value="Sweet">
            Sweet
          </option>

          <option value="Savoury">
            Savoury
          </option>
        </select>

        <button type="submit">
          {supplementEnModification
            ? '💾 Enregistrer'
            : '➕ Ajouter le supplément'}
        </button>

        {supplementEnModification && (
          <button
            type="button"
            onClick={annulerModificationSupplement}
          >
            Annuler
          </button>
        )}

      </form>

    </div>
  )
}

export default Admin