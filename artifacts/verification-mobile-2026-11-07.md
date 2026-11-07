# Verification mobile - Vision Altitude

Date : 7 novembre 2026.

## Perimetre

- Verification du depot local, sans deploiement.
- 99 fichiers HTML : les 93 pages du sitemap, la page Exemples de travaux,
  l'offre de services imprimable, le prototype prive et les trois anciens
  fichiers de photographie dont les URL publiques sont redirigees.
- 297 combinaisons page/largeur : 320, 390 et 768 pixels.
- Tests dans Edge/Chromium avec emulation tactile et reduction des animations.
- Verification visuelle de captures de l'accueil, d'un guide comparatif,
  d'une etude de cas, d'une page sectorielle, des tarifs video,
  des logos clients et de l'offre imprimable.

## Corrections

1. Les tableaux des guides Drone ou nacelle, Drone ou helicoptere et
   Drone ou photographie au sol imposaient une largeur minimale a toute
   la colonne. Sur telephone, le texte et certains boutons etaient coupes.
   La grille accepte maintenant de retrecir. Les tableaux restent consultables
   par defilement horizontal dans leur propre cadre.
2. Le titre du prototype prive Securi-Terre ne pouvait pas revenir a la ligne
   a certaines largeurs de tablette. Le retour a la ligne est maintenant
   autorise sous 980 pixels, sans modification de l'affichage sur ordinateur.
3. Les quatre pages concernees utilisent une nouvelle reference de cache CSS.

Les textes, images, URL, metadonnees, canonicales et donnees structurees
n'ont pas ete modifies.

## Resultats apres correction

| Controle | Resultat |
| --- | --- |
| Mise en page des 99 fichiers a 320 pixels | Conforme |
| Mise en page des 99 fichiers a 390 pixels | Conforme |
| Mise en page des 99 fichiers a 768 pixels | Conforme |
| Debordements du texte hors de l'ecran | Aucun detecte |
| Texte tronque par sa largeur | Aucun detecte |
| Images locales manquantes | Aucune detectee |
| Erreurs JavaScript pendant les parcours | Aucune detectee |
| Cibles des liens et ressources locales references | Aucune manquante |
| Ouverture/fermeture du menu sur les 97 en-tetes standards | Conforme |
| Menus imbriques et acces aux derniers liens en portrait et paysage | Conforme |
| Accordeons FAQ presents | Ouverture/fermeture conformes |
| Pagination du pied de page, aller et retour | Conforme |
| Carrousels photo et video, navigation precedente/suivante | Conforme |
| Calculateurs des trois pages Tarifs | Fonctionnels |
| Validation des champs du formulaire de contact | Conforme |
| Ouverture/fermeture du panneau partenaire | Conforme |

Les apercus partiels des diapositives voisines dans le carrousel du prototype
prive sont intentionnels et restent decoupes par son cadre.

## Limites

- Les tests utilisent l'emulation d'un navigateur de bureau, pas des telephones
  physiques ni Safari sur iPhone.
- Les lecteurs YouTube sont remplaces par des cadres de test pendant l'audit :
  leur mise en page et la navigation sont verifiees, mais pas la lecture externe.
- Les services externes sont bloques : aucun formulaire n'a ete envoye,
  aucune livraison de courriel n'a ete verifiee.
- Les liens externes et les redirections Cloudflare ne sont pas testes sur
  l'hebergement public.
