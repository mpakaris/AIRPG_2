
import { initializeApp, getApps, getApp, type FirebaseApp, type FirebaseOptions } from 'firebase/app';
import { getFirestore, initializeFirestore, Firestore } from 'firebase/firestore';
import { getAuth, Auth } from 'firebase/auth';
import { firebaseConfig } from './config';

type FirebaseServices = {
  firebaseApp: FirebaseApp;
  firestore: Firestore;
  auth: Auth;
};

// IMPORTANT: DO NOT MODIFY THIS FUNCTION
export function initializeFirebase(): FirebaseServices {
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

    const auth = getAuth(firebaseApp);

    return { firebaseApp, firestore, auth };

  } else {
    const firebaseApp = getApp();
    const firestore = getFirestore(firebaseApp);
    const auth = getAuth(firebaseApp);
    return { firebaseApp, firestore, auth };
  }
}
