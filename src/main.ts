// Point d'entrée de l'application Angular
// Ce fichier est exécuté en premier au démarrage
import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';


/* 
  Lance l'application en montant le composant App
  avec la configuration définie dans appConfig.
  .catch() : erreurs au démarrage.
*/
bootstrapApplication(App, appConfig)
  .catch((err) => console.error(err));
