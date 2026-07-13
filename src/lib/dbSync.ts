import { 
  collection, 
  doc, 
  setDoc, 
  deleteDoc, 
  writeBatch, 
  getDocs,
  getDoc
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
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
  defaultSettings,
  initialEmployees,
  initialSupplyItems
} from '../data';

// Helper to sanitize document paths if necessary (e.g. for emails)
const getAccountDocId = (email: string) => {
  return email.toLowerCase().trim().replace(/[\.\#\$\[\]]/g, '_');
};

// Recursive helper to clean undefined fields before saving to Firestore, as Firestore throws an error for undefined values
function cleanUndefined<T>(obj: T): T {
  if (obj === null || obj === undefined) {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map(item => cleanUndefined(item)) as unknown as T;
  }
  if (typeof obj === 'object') {
    const newObj: any = {};
    for (const key of Object.keys(obj)) {
      const val = (obj as any)[key];
      if (val !== undefined) {
        newObj[key] = cleanUndefined(val);
      }
    }
    return newObj as T;
  }
  return obj;
}

// Seeding helper to initialize Firestore when first provisioned or empty
export async function seedFirestoreIfEmpty() {
  try {
    // 1. Seed System Settings if empty
    const settingsDocRef = doc(db, 'settings', 'system');
    let settingsSnap;
    try {
      settingsSnap = await getDoc(settingsDocRef);
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, 'settings/system');
      return;
    }

    if (!settingsSnap.exists()) {
      try {
        await setDoc(settingsDocRef, defaultSettings);
        console.log('Seeded default settings to Firestore');
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, 'settings/system');
      }
    }

    // 2. Seed User Accounts if empty
    const accountsColRef = collection(db, 'accounts');
    let accountsSnap;
    try {
      accountsSnap = await getDocs(accountsColRef);
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'accounts');
      return;
    }

    if (accountsSnap.empty) {
      try {
        const batch = writeBatch(db);
        initialAccounts.forEach(acc => {
          const docId = getAccountDocId(acc.email);
          const docRef = doc(db, 'accounts', docId);
          batch.set(docRef, cleanUndefined(acc));
        });
        await batch.commit();
        console.log('Seeded initial accounts to Firestore');
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, 'accounts');
      }
    }

    // 3. Seed Employees if empty
    const employeesColRef = collection(db, 'employees');
    let employeesSnap;
    try {
      employeesSnap = await getDocs(employeesColRef);
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'employees');
      return;
    }

    if (employeesSnap.empty) {
      try {
        const batch = writeBatch(db);
        initialEmployees.forEach(emp => {
          const docRef = doc(db, 'employees', emp.id);
          batch.set(docRef, cleanUndefined(emp));
        });
        await batch.commit();
        console.log('Seeded initial employees to Firestore');
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, 'employees');
      }
    }

    // 4. Seed Supply Items if empty
    const supplyItemsColRef = collection(db, 'supplyItems');
    let supplyItemsSnap;
    try {
      supplyItemsSnap = await getDocs(supplyItemsColRef);
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'supplyItems');
      return;
    }

    if (supplyItemsSnap.empty) {
      try {
        const batch = writeBatch(db);
        initialSupplyItems.forEach(item => {
          const docRef = doc(db, 'supplyItems', item.id);
          batch.set(docRef, cleanUndefined(item));
        });
        await batch.commit();
        console.log('Seeded initial supply items to Firestore');
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, 'supplyItems');
      }
    }
  } catch (error) {
    console.error('Error during Firestore seeding:', error);
  }
}

// --- EMPLOYEES MUTATORS ---
export async function saveEmployeeCloud(emp: Employee) {
  try {
    const docRef = doc(db, 'employees', emp.id);
    await setDoc(docRef, cleanUndefined(emp));
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `employees/${emp.id}`);
  }
}

export async function deleteEmployeeCloud(id: string) {
  try {
    const docRef = doc(db, 'employees', id);
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `employees/${id}`);
  }
}

// --- LEAVE REQUESTS MUTATORS ---
export async function saveLeaveRequestCloud(req: LeaveRequest) {
  try {
    const docRef = doc(db, 'leaveRequests', req.id);
    await setDoc(docRef, cleanUndefined(req));
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `leaveRequests/${req.id}`);
  }
}

export async function deleteLeaveRequestCloud(id: string) {
  try {
    const docRef = doc(db, 'leaveRequests', id);
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `leaveRequests/${id}`);
  }
}

// --- SUPPLY ITEMS MUTATORS ---
export async function saveSupplyItemCloud(item: SupplyItem) {
  try {
    const docRef = doc(db, 'supplyItems', item.id);
    await setDoc(docRef, cleanUndefined(item));
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `supplyItems/${item.id}`);
  }
}

export async function deleteSupplyItemCloud(id: string) {
  try {
    const docRef = doc(db, 'supplyItems', id);
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `supplyItems/${id}`);
  }
}

// --- SUPPLY REQUESTS MUTATORS ---
export async function saveSupplyRequestCloud(req: SupplyRequest) {
  try {
    const docRef = doc(db, 'supplyRequests', req.id);
    await setDoc(docRef, cleanUndefined(req));
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `supplyRequests/${req.id}`);
  }
}

export async function deleteSupplyRequestCloud(id: string) {
  try {
    const docRef = doc(db, 'supplyRequests', id);
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `supplyRequests/${id}`);
  }
}

// --- SYSTEM SETTINGS MUTATORS ---
export async function saveSettingsCloud(settings: SystemSettings) {
  try {
    const docRef = doc(db, 'settings', 'system');
    await setDoc(docRef, cleanUndefined(settings));
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'settings/system');
  }
}

// --- USER ACCOUNTS MUTATORS ---
export async function saveAccountCloud(acc: UserAccount) {
  const docId = getAccountDocId(acc.email);
  try {
    const docRef = doc(db, 'accounts', docId);
    await setDoc(docRef, cleanUndefined(acc));
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `accounts/${docId}`);
  }
}

export async function deleteAccountCloud(email: string) {
  const docId = getAccountDocId(email);
  try {
    const docRef = doc(db, 'accounts', docId);
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `accounts/${docId}`);
  }
}

// --- ARCHIVES MUTATORS ---
export async function saveArchiveCloud(archive: ArchiveRecord) {
  try {
    const docRef = doc(db, 'archives', archive.id);
    await setDoc(docRef, cleanUndefined(archive));
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `archives/${archive.id}`);
  }
}

export async function deleteArchiveCloud(id: string) {
  try {
    const docRef = doc(db, 'archives', id);
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `archives/${id}`);
  }
}

// --- ATTENDANCE RECORDS MUTATORS ---
export async function saveAttendanceRecordCloud(record: AttendanceRecord) {
  try {
    const docRef = doc(db, 'attendanceRecords', record.id);
    await setDoc(docRef, cleanUndefined(record));
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `attendanceRecords/${record.id}`);
  }
}

export async function deleteAttendanceRecordCloud(id: string) {
  try {
    const docRef = doc(db, 'attendanceRecords', id);
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `attendanceRecords/${id}`);
  }
}

export async function clearAllAttendanceCloud() {
  try {
    const colRef = collection(db, 'attendanceRecords');
    let snap;
    try {
      snap = await getDocs(colRef);
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'attendanceRecords');
      return;
    }

    const batch = writeBatch(db);
    snap.docs.forEach(d => {
      batch.delete(d.ref);
    });
    
    try {
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'attendanceRecords');
    }
  } catch (err) {
    console.error('Error clearing attendance records on cloud:', err);
  }
}

export async function clearAllLeaveRequestsCloud() {
  try {
    const colRef = collection(db, 'leaveRequests');
    let snap;
    try {
      snap = await getDocs(colRef);
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'leaveRequests');
      return;
    }

    const batch = writeBatch(db);
    snap.docs.forEach(d => {
      batch.delete(d.ref);
    });

    try {
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'leaveRequests');
    }
  } catch (err) {
    console.error('Error clearing leave requests on cloud:', err);
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
    try {
      const colRef = collection(db, colName);
      const snap = await getDocs(colRef);
      const batch = writeBatch(db);
      snap.docs.forEach(d => {
        batch.delete(d.ref);
      });
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, colName);
    }
  }

  // Restore defaults
  try {
    await setDoc(doc(db, 'settings', 'system'), cleanUndefined(defaultSettings));
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'settings/system');
  }
  
  try {
    const accountsBatch = writeBatch(db);
    initialAccounts.forEach(acc => {
      const docId = getAccountDocId(acc.email);
      const docRef = doc(db, 'accounts', docId);
      accountsBatch.set(docRef, cleanUndefined(acc));
    });
    await accountsBatch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'accounts');
  }

  try {
    const employeesBatch = writeBatch(db);
    initialEmployees.forEach(emp => {
      const docRef = doc(db, 'employees', emp.id);
      employeesBatch.set(docRef, cleanUndefined(emp));
    });
    await employeesBatch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'employees');
  }

  try {
    const supplyBatch = writeBatch(db);
    initialSupplyItems.forEach(item => {
      const docRef = doc(db, 'supplyItems', item.id);
      supplyBatch.set(docRef, cleanUndefined(item));
    });
    await supplyBatch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'supplyItems');
  }
}
