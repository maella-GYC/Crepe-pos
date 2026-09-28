function Cuisine({ commandes, changerStatut }) {
  const commandesEnCuisine = commandes.filter(
    (commande) => commande.statut !== 'Terminée'
  )

  return (
    <div className="cuisine">
      <h1>👨‍🍳 Cuisine</h1>

      {commandesEnCuisine.length === 0 ? (
        <p className="cuisine-vide">Aucune commande</p>
      ) : (
        <div className="commandes-cuisine">
          {commandesEnCuisine.map((commande) => (
            <div
              className="commande-cuisine"
              key={commande.id}
            >

 <div className="contenu-commande-cuisine">

  <div className="infos-commande-cuisine">

    <div className="numero-commande">
      #{commande.numero}
    </div>

    <div className="articles-cuisine">
      {commande.articles.map((article) => (
        <div
  className={`article-cuisine ${
    article.categorie === 'Savoury'
      ? article.typeRecette === 'viande'
        ? 'produit-viande'
        : 'produit-vege'
      : ''
  }`}
  key={article.id}
>
          <span className="quantite-cuisine">
            {article.quantite} ×
          </span>

          <div>
            <strong>{article.nom}</strong>

            {article.personnalise && (
              <div className="composition-cuisine">

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
        </div>
      ))}
    </div>

  </div>

  <button
    className="pret"
    onClick={() =>
      changerStatut(
        commande.id,
        'Terminée'
      )
    }
  >
    ✅ PRÊT
  </button>

</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
export default Cuisine