
import { initializeApp, getApps, getApp, type FirebaseOptions } from 'firebase/app';
import { getFirestore, initializeFirestore } from 'firebase/firestore';
import { firebaseConfig } from './config';

// IMPORTANT: DO NOT MODIFY THIS FUNCTION
export function initializeFirebase() {
  if (!getApps().length) {
    let firebaseApp;
    try {
      // This is for Firebase App Hosting environments
      firebaseApp = initializeApp();
    } catch (e) {
      console.log('Could not init Firebase App Hosting, falling back to config file...');
      firebaseApp = initializeApp(firebaseConfig as FirebaseOptions);
    }
    
    // Use initializeFirestore to avoid issues with modular SDK
    const firestore = initializeFirestore(firebaseApp, {
        ignoreUndefinedProperties: true,
    });

    return { firebaseApp, firestore };

  } else {
    const firebaseApp = getApp();
    const firestore = getFirestore(firebaseApp);
    return { firebaseApp, firestore };
  }
}
