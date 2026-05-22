# Joumla Store — Prochaines Missions

Dans l'ordre de priorité :

## 1. Tester et finaliser l'admin mobile

L'admin mobile a été refondu avec 11 onglets mais n'a **pas été testé en conditions réelles** car le QR Expo ne fonctionne pas en partage 4G. Une fois la connectivité rétablie (tunnel, routeur, ou USB), il faut vérifier que toutes les mutations CRUD marchent côté mobile.

## 2. Améliorer la page Factures/BL

Actuellement `/delivery-notes` redirige vers `OrdersPageClient`. Il faudrait :
- Une vraie page BL
- Numérotation `BL-YYYY-NNNNNN`
- Saisie ancien solde/versement/nouveau solde
- Génération PDF (déjà implémentée côté API dans `deliveryNotes.adminGeneratePdf`)

## 3. Finaliser le Dashboard admin web

Le dashboard montre les KPIs mais manque de graphiques ou d'historique. Ce n'est pas bloquant pour V1.

## 4. Notifications push

Le code de notification est présent côté serveur (`notifications-shared.ts`) mais :
- Les Expo Push Tokens ne sont pas stockés côté client
- L'enregistrement du token n'est pas branché après login
- Les abonnements aux notifications ne sont pas demandés

## 5. Traductions manquantes

Certains labels admin mobile (Paramètres) sont en français seulement. Les traductions arabes doivent être complétées.

## XR — Problème Réseau

Le QR Expo ne marche pas avec le partage 4G depuis le téléphone hôte. Solution immédiate : utiliser `bunx expo start --tunnel` ou brancher les deux appareils sur un vrai routeur Wi-Fi.
