# Volets & Soleil

Pour chaque façade de votre maison, cette intégration indique si le soleil la touche et **de combien fermer les
volets** pour garder la maison au frais l'été, ou laisser entrer le soleil l'hiver. Tout est calculé localement
d'après la position du soleil : pas de compte, pas d'accès à Internet, pas d'API.

L'intégration ne bouge jamais un volet elle-même : ce sont vos scènes qui le font, avec les valeurs qu'elle
publie.

_Développée sans volets reliés à un Gladys de test : vos retours sont les bienvenus sur le forum._

## Ce que vous obtenez

Un appareil par façade, avec :

- **Soleil sur la façade** (oui / non) : le soleil est au-dessus du seuil et devant le mur ;
- **Fermeture conseillée** (0-100 %), détaillée plus bas ;
- **Ensoleillement direct** (0-100 %) : la part de la force du soleil qui frappe le mur, `100 × cos θ`, quelle
  que soit la saison ;
- **Angle d'incidence du soleil** (°) : 0° quand le soleil fait face au mur, 90° en lumière rasante, ou quand le
  soleil n'est pas sur la façade ;
- **Prochaine arrivée du soleil** et **Prochain départ du soleil**, en heure locale (`14:32`, `demain 07:12`),
  sur les 48 prochaines heures.

Tout est recalculé chaque minute ; seules les valeurs qui changent sont envoyées à Gladys.

**La fermeture conseillée.** Avec θ l'angle entre les rayons du soleil et la façade, et `h` la hauteur du
soleil :

`fermeture = 100 × cos θ × min(1, h / 15°)`, arrondie à 10 % près.

Une façade ouest à 19 h en juillet (soleil bas et de face) obtient 90 % ; une façade sud à midi (soleil haut,
rayons presque parallèles au mur) 40 % ; le second facteur adoucit les premières minutes d'un soleil bas, encore
faible. **En hiver, le conseil est toujours 0 %** : ouvert, pour que le soleil chauffe la maison. Les paliers de
10 % évitent de bouger les volets chaque minute.

## Configuration

- **Position** : les coordonnées de votre maison dans Gladys (**Paramètres → Maisons**). L'intégration demande
  l'autorisation de les lire à l'installation. Sans elles, elle affiche une erreur et revérifie toutes les 10
  minutes.
- **Langue des noms et des textes** : la langue des noms d'appareils et des textes envoyés à Gladys.
- **Saison** : _Automatique (mois)_ suit les mois d'été choisis (une plage qui passe le nouvel an fonctionne,
  pour l'hémisphère sud) ; _Toujours été_ ou _Toujours hiver_. L'intégration ne peut pas lire elle-même votre
  thermomètre : pour suivre la température extérieure, utilisez l'action de scène **Imposer la saison** (voir
  plus bas).
- **Élévation minimale du soleil** : en dessous de cette hauteur au-dessus de l'horizon, le soleil est ignoré
  (5° par défaut).
- **Façades 1 à 6** : renseignez l'**orientation** de chaque façade, la direction que regardent ses fenêtres :
  degrés depuis le nord, sens horaire (90 = est, 180 = sud, 270 = ouest), ou un point cardinal (N, NE, E, SE,
  S, SO, O, NO, et NNE, ENE…) ; `W` vaut aussi ouest. Une orientation vide ignore l'emplacement. Facultatif :
  - **Nom** : le nom de l'appareil (sinon « Façade S ») ;
  - **Champ de vue** : 180° pour un mur plat, moins quand des embrasures profondes ou des murs en retour cachent
    le soleil plus tôt ;
  - **Masque d'horizon** : l'élévation cachée par une colline, un immeuble ou un balcon devant la façade.

Astuce : une application de cartes donne l'orientation de vos murs ; une façade sud-sud-ouest fait environ 200°.

## Actions

- **Voir le conseil maintenant** : la saison en vigueur et le conseil de chaque façade, pour vérifier les
  orientations.

## Scènes

**Déclencheur « Le soleil arrive sur une façade »** : choisissez la façade et le moment : à l'arrivée, 15 min,
30 min ou 1 heure avant. Variables : la façade, l'heure d'arrivée, les minutes avant l'arrivée, la **fermeture
conseillée maximale** de la période ensoleillée qui commence, et la saison (`summer` ou `winter`).

Exemples :

- _Baisser les volets du salon avant le soleil_ : déclencheur « Le soleil arrive sur une façade », Salon, 30 min
  avant → condition : la variable saison vaut `summer` → régler la position des volets.
- _Fermer davantage quand il tape fort_ : déclencheur sur la **Fermeture conseillée** de l'appareil façade
  au-dessus de 70 % → régler la position des volets à 30 % (dans Gladys, la position d'un volet compte
  l'ouverture).
- _Rouvrir quand le soleil s'en va_ : déclencheur sur **Soleil sur la façade** qui passe à « non » → ouvrir les
  volets.

**Action « Imposer la saison »** : été, hiver, ou retour à la configuration. Par exemple une scène « chaque jour à
10 h, si la température extérieure dépasse 25 °C → Imposer la saison : été ». Le choix est gardé après un
redémarrage. Sortie : la saison en vigueur.

## Tableau de bord

Le widget **Soleil sur les façades** liste chaque façade avec sa fermeture conseillée et le prochain horaire du
soleil, la saison en vigueur, et trois boutons pour imposer la saison (celui qui est actif porte une coche). Ses
réglages masquent la ligne de saison ou les boutons.

## Limites et dépannage

- « Aucune position de maison » : renseignez les coordonnées de la maison dans **Paramètres → Maisons** ; la
  première maison qui en a est utilisée.
- « Orientation de façade illisible » : corrigez l'orientation des emplacements cités dans le message (degrés ou
  points cardinaux).
- Le modèle est géométrique : ni nuages, ni météo. Les arbres et les voisins sont approchés par l'élévation
  minimale et le masque d'horizon.
- Les heures suivent le fuseau horaire de Gladys. Une période ensoleillée de moins de 5 minutes peut être
  manquée.
- Journaux : le conteneur n'écrit que son cycle de vie ; `LOG_LEVEL=debug` montre chaque calcul.
