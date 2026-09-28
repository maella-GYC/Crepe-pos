import { useState } from 'react'

function PersonnaliserProduits({
  produit,
  supplements,
  fermer,
  ajouterCommande,
}) {
  const ingredients = produit.ingredients || []

  const [ingredientsSelectionnes, setIngredientsSelectionnes] = useState(
    ingredients.map((_, index) => index)
  )

  const [supplementsSelectionnes, setSupplementsSelectionnes] = useState([])

  const toggleIngredient = (index) => {
    setIngredientsSelectionnes((selection) =>
      selection.includes(index)
        ? selection.filter((item) => item !== index)
        : [...selection, index]
    )
  }

  const toggleSupplement = (id) => {
    setSupplementsSelectionnes((selection) =>
      selection.includes(id)
        ? selection.filter((item) => item !== id)
        : [...selection, id]
    )
  }

  const prixIngredientsRetires = ingredients
    .filter((_, index) => !ingredientsSelectionnes.includes(index))
    .reduce(
      (total, ingredient) => total + Number(ingredient.prix),
      0
    )

  const totalSupplements = supplementsSelectionnes.reduce(
    (total, id) => {
      const supplement = supplements.find(
        (item) => item.id === id
      )

      return total + (supplement ? Number(supplement.prix) : 0)
    },
    0
  )

  const prixTotal =
    Number(produit.prix) -
    prixIngredientsRetires +
    totalSupplements

  const ajouterPersonnalise = () => {
    const ingredientsChoisis = ingredients.filter((_, index) =>
      ingredientsSelectionnes.includes(index)
    )

    const ingredientsRetires = ingredients.filter(
      (_, index) => !ingredientsSelectionnes.includes(index)
    )

    const supplementsChoisis = supplements.filter((supplement) =>
      supplementsSelectionnes.includes(supplement.id)
    )

    const produitPersonnalise = {
      ...produit,
      id: `${produit.id}-${Date.now()}`,
      nom: produit.nom,
      prix: prixTotal,
      ingredients: ingredientsChoisis,
      ingredientsRetires: ingredientsRetires,
      supplements: supplementsChoisis,
      personnalise: true,
    }

    ajouterCommande(produitPersonnalise)
  }

  return (
    <div className="personnalisation-overlay">
      <div className="personnalisation">
        <h2>{produit.nom}</h2>

        <h3>Ingrédients</h3>

        <div className="ingredients">
          {ingredients.map((ingredient, index) => (
            <label className="ingredient" key={index}>
              <input
                type="checkbox"
                checked={ingredientsSelectionnes.includes(index)}
                onChange={() => toggleIngredient(index)}
              />

              <span>{ingredient.nom}</span>

              <strong>
                {Number(ingredient.prix).toFixed(2)} $
              </strong>
            </label>
          ))}
        </div>

        <h3>Suppléments</h3>

        <div className="supplements">
          {supplements.map((supplement) => (
            <label
              className="supplement"
              key={supplement.id}
            >
              <input
                type="checkbox"
                checked={supplementsSelectionnes.includes(
                  supplement.id
                )}
                onChange={() =>
                  toggleSupplement(supplement.id)
                }
              />

              <span>{supplement.nom}</span>

              <strong>
                +{Number(supplement.prix).toFixed(2)} $
              </strong>
            </label>
          ))}
        </div>

        <div className="prix-personnalise">
          <span>Total</span>
          <strong>{prixTotal.toFixed(2)} $</strong>
        </div>

        <div className="personnalisation-actions">
          <button type="button" onClick={fermer}>
            Annuler
          </button>

          <button
            type="button"
            onClick={ajouterPersonnalise}
          >
            Ajouter
          </button>
        </div>
      </div>
    </div>
  )
}

export default PersonnaliserProduits