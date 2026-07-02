import { 
  collection, 
  doc, 
  setDoc, 
  deleteDoc, 
  writeBatch, 
  getDocs,
  getDoc
} from 'firebase/firestore';
import { db } from '../firebase';
import { 
  Employee, 
  LeaveRequest, 
  SupplyItem, 
  SupplyRequest, 
  SystemSettings, 
  UserAccount, 
  ArchiveRecord, 
  AttendanceRecord 
} from '../types';
import { 
  initialAccounts, 
  defaultSettings 
} from '../data';

// Helper to sanitize document paths if necessary (e.g. for emails)
const getAccountDocId = (email: string) => {
  return email.toLowerCase().trim().replace(/[\.\#\$\[\]]/g, '_');
};

// Seeding helper to initialize Firestore when first provisioned or empty
export async function seedFirestoreIfEmpty() {
  try {
    // 1. Seed System Settings if empty
    const settingsDocRef = doc(db, 'settings', 'system');
    const settingsSnap = await getDoc(settingsDocRef);
    if (!settingsSnap.exists()) {
      await setDoc(settingsDocRef, defaultSettings);
      console.log('Seeded default settings to Firestore');
    }

    // 2. Seed User Accounts if empty
    const accountsColRef = collection(db, 'accounts');
    const accountsSnap = await getDocs(accountsColRef);
    if (accountsSnap.empty) {
      const batch = writeBatch(db);
      initialAccounts.forEach(acc => {
        const docId = getAccountDocId(acc.email);
        const docRef = doc(db, 'accounts', docId);
        batch.set(docRef, acc);
      });
      await batch.commit();
      console.log('Seeded initial accounts to Firestore');
    }
  } catch (error) {
    console.error('Error during Firestore seeding:', error);
  }
}

// --- EMPLOYEES MUTATORS ---
export async function saveEmployeeCloud(emp: Employee) {
  const docRef = doc(db, 'employees', emp.id);
  await setDoc(docRef, emp);
}

export async function deleteEmployeeCloud(id: string) {
  const docRef = doc(db, 'employees', id);
  await deleteDoc(docRef);
}

// --- LEAVE REQUESTS MUTATORS ---
export async function saveLeaveRequestCloud(req: LeaveRequest) {
  const docRef = doc(db, 'leaveRequests', req.id);
  await setDoc(docRef, req);
}

export async function deleteLeaveRequestCloud(id: string) {
  const docRef = doc(db, 'leaveRequests', id);
  await deleteDoc(docRef);
}

// --- SUPPLY ITEMS MUTATORS ---
export async function saveSupplyItemCloud(item: SupplyItem) {
  const docRef = doc(db, 'supplyItems', item.id);
  await setDoc(docRef, item);
}

export async function deleteSupplyItemCloud(id: string) {
  const docRef = doc(db, 'supplyItems', id);
  await deleteDoc(docRef);
}

// --- SUPPLY REQUESTS MUTATORS ---
export async function saveSupplyRequestCloud(req: SupplyRequest) {
  const docRef = doc(db, 'supplyRequests', req.id);
  await setDoc(docRef, req);
}

export async function deleteSupplyRequestCloud(id: string) {
  const docRef = doc(db, 'supplyRequests', id);
  await deleteDoc(docRef);
}

// --- SYSTEM SETTINGS MUTATORS ---
export async function saveSettingsCloud(settings: SystemSettings) {
  const docRef = doc(db, 'settings', 'system');
  await setDoc(docRef, settings);
}

// --- USER ACCOUNTS MUTATORS ---
export async function saveAccountCloud(acc: UserAccount) {
  const docId = getAccountDocId(acc.email);
  const docRef = doc(db, 'accounts', docId);
  await setDoc(docRef, acc);
}

export async function deleteAccountCloud(email: string) {
  const docId = getAccountDocId(email);
  const docRef = doc(db, 'accounts', docId);
  await deleteDoc(docRef);
}

// --- ARCHIVES MUTATORS ---
export async function saveArchiveCloud(archive: ArchiveRecord) {
  const docRef = doc(db, 'archives', archive.id);
  await setDoc(docRef, archive);
}

export async function deleteArchiveCloud(id: string) {
  const docRef = doc(db, 'archives', id);
  await deleteDoc(docRef);
}

// --- ATTENDANCE RECORDS MUTATORS ---
export async function saveAttendanceRecordCloud(record: AttendanceRecord) {
  const docRef = doc(db, 'attendanceRecords', record.id);
  await setDoc(docRef, record);
}

export async function deleteAttendanceRecordCloud(id: string) {
  const docRef = doc(db, 'attendanceRecords', id);
  await deleteDoc(docRef);
}

export async function clearAllAttendanceCloud() {
  try {
    const colRef = collection(db, 'attendanceRecords');
    const snap = await getDocs(colRef);
    const batch = writeBatch(db);
    snap.docs.forEach(d => {
      batch.delete(d.ref);
    });
    await batch.commit();
  } catch (err) {
    console.error('Error clearing attendance records on cloud:', err);
  }
}

// --- RESET ALL STATE MUTATOR ---
export async function resetAllCloudStateCloud() {
  const collections = [
    'employees',
    'leaveRequests',
    'supplyItems',
    'supplyRequests',
    'accounts',
    'archives',
    'attendanceRecords'
  ];

  for (const colName of collections) {
    const colRef = collection(db, colName);
    const snap = await getDocs(colRef);
    const batch = writeBatch(db);
    snap.docs.forEach(d => {
      batch.delete(d.ref);
    });
    await batch.commit();
  }

  // Restore defaults
  await setDoc(doc(db, 'settings', 'system'), defaultSettings);
  
  const accountsBatch = writeBatch(db);
  initialAccounts.forEach(acc => {
    const docId = getAccountDocId(acc.email);
    const docRef = doc(db, 'accounts', docId);
    accountsBatch.set(docRef, acc);
  });
  await accountsBatch.commit();
}
