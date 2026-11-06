import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { app } from "./firebaseApp";

export { app };

// Export Firestore Database & Storage instances for your application
export const db = getFirestore(app);
export const storage = getStorage(app);