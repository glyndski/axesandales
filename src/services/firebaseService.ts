import { 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    signOut,
    updatePassword,
    GoogleAuthProvider,
    signInWithPopup
} from 'firebase/auth';
import { 
    doc, 
    setDoc, 
    getDoc, 
    collection, 
    getDocs, 
    updateDoc, 
    deleteDoc
} from 'firebase/firestore';
import { auth, db } from '../firebaseConfig';
import { User } from '../types';

const googleProvider = new GoogleAuthProvider();

// Fetch a user's profile from Firestore
export const getUserProfile = async (uid: string): Promise<User | null> => {
    const docRef = doc(db, 'users', uid);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
        const data = docSnap.data();
        return {
            id: uid,
            email: data.email,
            name: data.name,
            isMember: data.isMember,
            isAdmin: data.isAdmin,
        };
    }
    return null;
};

// Create a pending Firestore profile for a new user
export const createPendingProfile = async (uid: string, email: string, name: string): Promise<User> => {
    const profile: Omit<User, 'id'> = {
        email,
        name,
        isMember: false,
        isAdmin: false,
    };
    await setDoc(doc(db, 'users', uid), profile);
    return { id: uid, ...profile };
};

// Self-service registration (email/password)
export const register = async (email: string, password: string, name: string): Promise<User> => {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const { user } = userCredential;
    return createPendingProfile(user.uid, email, name);
};

// Google sign-in (creates profile if first time)
export const signInWithGoogle = async (): Promise<User> => {
    const result = await signInWithPopup(auth, googleProvider);
    const { user } = result;
    // Check if profile already exists
    const existing = await getUserProfile(user.uid);
    if (existing) return existing;
    // First-time Google user — create pending profile
    return createPendingProfile(
        user.uid,
        user.email || '',
        user.displayName || user.email || 'New User'
    );
};

// Login
export const login = async (email: string, pass: string) => {
    return signInWithEmailAndPassword(auth, email, pass);
};

// Logout
export const logout = async () => {
    return signOut(auth);
};

// Change Password
export const changePassword = async (newPassword: string) => {
    const user = auth.currentUser;
    if (user) {
        return updatePassword(user, newPassword);
    }
    throw new Error("No authenticated user found.");
};

// --- ADMIN FUNCTIONS ---

export const getAllUsers = async (): Promise<User[]> => {
    const usersCol = collection(db, 'users');
    const userSnapshot = await getDocs(usersCol);
    const userList = userSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
    } as User));
    return userList;
};

export const updateUserProfile = async (uid: string, data: Partial<User>) => {
    const userDoc = doc(db, 'users', uid);
    return updateDoc(userDoc, data);
};

export const deleteUser = async (uid: string) => {
    alert("SECURITY WARNING: Deleting users from the client is insecure and often disabled. Please delete this user from the Firebase Authentication and Firestore consoles manually.");
    // First, delete the Firestore document.
    const userDoc = doc(db, 'users', uid);
    await deleteDoc(userDoc);
};