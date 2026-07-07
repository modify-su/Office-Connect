import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  Package, 
  Search, 
  Plus, 
  ShoppingCart, 
  Trash2, 
  ClipboardList, 
  Check, 
  X, 
  AlertTriangle, 
  CheckCircle2,
  ListFilter,
  User,
  Tags,
  DollarSign,
  Layers,
  ArrowDownToLine,
  ArrowUpFromLine,
  QrCode,
  Printer,
  Download,
  ScanLine,
  RefreshCw,
  Maximize2,
  Sparkles,
  Camera,
  CheckCircle,
  Edit2
} from 'lucide-react';
import { SupplyItem, SupplyRequest, Employee, UserAccount, SystemSettings } from '../types';
import { QRCodeSVG } from 'qrcode.react';
import { Html5Qrcode } from 'html5-qrcode';

interface SupplySectionProps {
  supplyItems: SupplyItem[];
  supplyRequests: SupplyRequest[];
  employees: Employee[];
  onAddSupplyItem: (item: Omit<SupplyItem, 'id' | 'code'>) => void;
  onRestockItem: (id: string, amount: number) => void;
  onAddSupplyRequest: (req: Omit<SupplyRequest, 'id' | 'createdAt' | 'status'> | Omit<SupplyRequest, 'id' | 'createdAt' | 'status'>[]) => void;
  onApproveRequest: (id: string) => void;
  onRejectRequest: (id: string) => void;
  defaultAddOpen?: boolean;
  onClearDefaultAddOpen?: () => void;
  currentUser?: UserAccount | null;
  settings?: SystemSettings;
  onUpdateSettings?: (settings: SystemSettings) => void;
  onUpdateSupplyItems?: (items: SupplyItem[]) => void;
  onUpdateSupplyItem?: (item: SupplyItem) => void;
  onDeleteSupplyItem?: (id: string) => void;
}

export default function SupplySection({
  supplyItems,
  supplyRequests,
  employees,
  onAddSupplyItem,
  onRestockItem,
  onAddSupplyRequest,
  onApproveRequest,
  onRejectRequest,
  defaultAddOpen,
  onClearDefaultAddOpen,
  currentUser,
  settings,
  onUpdateSettings,
  onUpdateSupplyItems,
  onUpdateSupplyItem,
  onDeleteSupplyItem
}: SupplySectionProps) {
  const isEmployee = currentUser?.role === 'employee';
  const isEmployeeOnly = isEmployee && !currentUser?.permissions?.canApproveSupply;
  const canManageSupplyItems = currentUser?.role === 'admin' || currentUser?.permissions?.canManageSupplyItems;

  // Navigation tabs inside supply section: 'inventory' VS 'requests'
  const [subTab, setSubTab] = useState<'inventory' | 'requests'>('inventory');

  // Search / Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  // Category management state
  const [isManageCategoriesModalOpen, setIsManageCategoriesModalOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [editingCategoryIndex, setEditingCategoryIndex] = useState<number | null>(null);
  const [editingCategoryName, setEditingCategoryName] = useState('');

  // Modals state
  const [isAddItemModalOpen, setIsAddItemModalOpen] = useState(false);
  const [isEditItemModalOpen, setIsEditItemModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<SupplyItem | null>(null);
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [restockItemId, setRestockItemId] = useState<string | null>(null);
  const [restockAmount, setRestockAmount] = useState<number>(10);
  const [actingSupplyReq, setActingSupplyReq] = useState<{ id: string; action: 'approve' | 'reject' } | null>(null);

  // Local Confirmation Dialog
  const [localConfirm, setLocalConfirm] = useState<{
    title: string;
    message: string;
    onConfirm: () => void;
    isDanger?: boolean;
  } | null>(null);

  const askConfirm = (title: string, message: string, onConfirm: () => void, isDanger = false) => {
    setLocalConfirm({ title, message, onConfirm, isDanger });
  };

  // Form states - Add Item
  const [formItemName, setFormItemName] = useState('');
  const [formCategory, setFormCategory] = useState('เครื่องเขียน');
  const [formStock, setFormStock] = useState(1);
  const [formMinStock, setFormMinStock] = useState(5);
  const [formUnit, setFormUnit] = useState('ชิ้น');
  const [formPrice, setFormPrice] = useState(10);

  // Form states - Edit Item
  const [editFormItemName, setEditFormItemName] = useState('');
  const [editFormCategory, setEditFormCategory] = useState('เครื่องเขียน');
  const [editFormStock, setEditFormStock] = useState(0);
  const [editFormMinStock, setEditFormMinStock] = useState(5);
  const [editFormUnit, setEditFormUnit] = useState('ชิ้น');
  const [editFormPrice, setEditFormPrice] = useState(0);

  // Form states - Request Supply
  const [formEmployeeId, setFormEmployeeId] = useState('');
  const [formItemId, setFormItemId] = useState('');
  const [formQuantity, setFormQuantity] = useState(1);
  const [formPurpose, setFormPurpose] = useState('');
  const [requestItems, setRequestItems] = useState<{ itemId: string; quantity: number }[]>([
    { itemId: '', quantity: 1 }
  ]);

  // QR Code & Scanner State
  const [selectedQRItem, setSelectedQRItem] = useState<SupplyItem | null>(null);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [scannedItem, setScannedItem] = useState<SupplyItem | null>(null);
  const [scannerMode, setScannerMode] = useState<'restock' | 'withdraw'>('withdraw');
  const [scanQty, setScanQty] = useState<number>(1);
  const [scanPurpose, setScanPurpose] = useState('');
  const [scanEmployeeId, setScanEmployeeId] = useState('');
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [scanSuccessMsg, setScanSuccessMsg] = useState<string | null>(null);

  // Auto-fill scanner employee
  useEffect(() => {
    if (isScannerOpen) {
      if (isEmployee && currentUser?.employeeId) {
        setScanEmployeeId(currentUser.employeeId);
      } else if (employees.length > 0) {
        setScanEmployeeId(employees[0].employeeId);
      }
    }
  }, [isScannerOpen, isEmployee, currentUser, employees]);

  // QR Code Downloader
  const handleDownloadQR = () => {
    if (!selectedQRItem) return;
    const svg = document.getElementById(`qr-code-svg-${selectedQRItem.id}`);
    if (!svg) return;
    try {
      const svgString = new XMLSerializer().serializeToString(svg);
      const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
      const blobURL = window.URL.createObjectURL(svgBlob);
      const image = new Image();
      image.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = 300;
        canvas.height = 300;
        const context = canvas.getContext('2d');
        if (context) {
          context.fillStyle = '#FFFFFF';
          context.fillRect(0, 0, 300, 300);
          context.drawImage(image, 50, 50, 200, 200);
          
          context.fillStyle = '#1e293b';
          context.font = 'bold 12px sans-serif';
          context.textAlign = 'center';
          context.fillText(selectedQRItem.name, 150, 265);
          context.font = '10px monospace';
          context.fillText(selectedQRItem.code, 150, 282);
          
          const png = canvas.toDataURL('image/png');
          const downloadLink = document.createElement('a');
          downloadLink.href = png;
          downloadLink.download = `QR_${selectedQRItem.code}.png`;
          document.body.appendChild(downloadLink);
          downloadLink.click();
          document.body.removeChild(downloadLink);
        }
      };
      image.src = blobURL;
    } catch (err) {
      console.error("Failed to download QR code", err);
      alert("ไม่สามารถดาวน์โหลดรูปภาพได้ในเบราว์เซอร์นี้");
    }
  };

  const handlePrintQR = () => {
    if (!selectedQRItem) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert("ไม่สามารถเปิดหน้าต่างสำหรับพิมพ์ได้ กรุณาปิดการบล็อกป๊อปอัป");
      return;
    }
    const svgElement = document.getElementById(`qr-code-svg-${selectedQRItem.id}`);
    if (!svgElement) return;
    
    const svgHtml = svgElement.outerHTML;
    printWindow.document.write(`
      <html>
        <head>
          <title>Print QR Code - ${selectedQRItem.name}</title>
          <style>
            body {
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              height: 90vh;
              font-family: 'Inter', sans-serif;
              color: #1e293b;
              text-align: center;
              background-color: #ffffff;
            }
            .card {
              border: 1px solid #e2e8f0;
              border-radius: 16px;
              padding: 40px;
              max-width: 320px;
              box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
              background-color: #fff;
            }
            .title {
              font-size: 18px;
              font-weight: bold;
              margin-top: 20px;
              margin-bottom: 4px;
            }
            .subtitle {
              font-size: 12px;
              color: #64748b;
              font-family: monospace;
              letter-spacing: 0.05em;
            }
            svg {
              width: 200px;
              height: 200px;
            }
          </style>
        </head>
        <body>
          <div class="card">
            \${svgHtml}
            <div class="title">\${selectedQRItem.name}</div>
            <div class="subtitle">\${selectedQRItem.code}</div>
          </div>
          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 500);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // Camera integration
  useEffect(() => {
    let html5QrCode: Html5Qrcode | null = null;
    if (isScannerOpen && cameraActive && !scannedItem) {
      const startScanner = async () => {
        try {
          html5QrCode = new Html5Qrcode("reader");
          setCameraError(null);
          await html5QrCode.start(
            { facingMode: "environment" },
            {
              fps: 10,
              qrbox: (width, height) => {
                const size = Math.max(150, Math.min(width || 250, height || 250) * 0.7);
                return { width: size, height: size };
              }
            },
            (decodedText) => {
              let itemId = decodedText;
              if (decodedText.startsWith('office-supply:')) {
                itemId = decodedText.split(':')[1];
              }
              const item = supplyItems.find(i => i.id === itemId || i.code === itemId);
              if (item) {
                setScannedItem(item);
                setScanQty(1);
                setScanPurpose('');
                setScanSuccessMsg(null);
                if (html5QrCode && html5QrCode.isScanning) {
                  html5QrCode.stop().then(() => {
                    setCameraActive(false);
                  }).catch(err => console.log(err));
                }
              }
            },
            () => {
              // Ignore standard parse failures during live scanning
            }
          );
        } catch (err: any) {
          console.error("Camera start failed:", err);
          setCameraError(err?.message || "ไม่สามารถเข้าถึงกล้องถ่ายภาพได้");
          setCameraActive(false);
        }
      };

      startScanner();
    }

    return () => {
      if (html5QrCode && html5QrCode.isScanning) {
        html5QrCode.stop().then(() => {
          // clean up
        }).catch(err => console.log(err));
      }
    };
  }, [isScannerOpen, cameraActive, scannedItem, supplyItems]);

  const handleScanActionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!scannedItem) return;

    if (scannerMode === 'restock') {
      if (scanQty <= 0) {
        alert('กรุณากรอกจำนวนเติมสต็อกให้มากกว่า 0');
        return;
      }
      onRestockItem(scannedItem.id, scanQty);
      setScanSuccessMsg(`เพิ่มสต็อก "${scannedItem.name}" จำนวน ${scanQty} ${scannedItem.unit} สำเร็จแล้ว!`);
      // Update visual reference
      scannedItem.stock += scanQty;
      setScanQty(1);
    } else {
      if (scanQty <= 0) {
        alert('กรุณากรอกจำนวนเบิกให้มากกว่า 0');
        return;
      }
      if (scanQty > scannedItem.stock) {
        alert(`จำนวนสินค้าคงเหลือไม่พอในคลัง (คงเหลือ ${scannedItem.stock} ${scannedItem.unit})`);
        return;
      }
      const matchedEmployee = employees.find(emp => emp.employeeId === scanEmployeeId);
      if (!matchedEmployee) {
        alert('กรุณาเลือกชื่อพนักงานผู้รับสินค้าเบิกพัสดุ');
        return;
      }

      onAddSupplyRequest({
        employeeId: scanEmployeeId,
        employeeName: `${matchedEmployee.firstName} ${matchedEmployee.lastName}`,
        itemId: scannedItem.id,
        itemName: scannedItem.name,
        quantity: scanQty,
        purpose: scanPurpose || 'เบิกผ่านการสแกน QR Code'
      });

      setScanSuccessMsg(`ยื่นคำขอเบิกพัสดุ "${scannedItem.name}" จำนวน ${scanQty} ${scannedItem.unit} สำเร็จแล้ว!`);
      setScanQty(1);
      setScanPurpose('');
    }
  };

  const handleAddItemSlot = () => {
    const usedIds = requestItems.map(item => item.itemId);
    const nextItem = supplyItems.find(item => !usedIds.includes(item.id)) || supplyItems[0];
    setRequestItems(prev => [...prev, { itemId: nextItem ? nextItem.id : '', quantity: 1 }]);
  };

  const handleRemoveItemSlot = (index: number) => {
    if (requestItems.length <= 1) return;
    setRequestItems(prev => prev.filter((_, i) => i !== index));
  };

  const handleItemSlotChange = (index: number, itemId: string) => {
    setRequestItems(prev => prev.map((item, i) => i === index ? { ...item, itemId } : item));
  };

  const handleQuantitySlotChange = (index: number, quantity: number) => {
    setRequestItems(prev => prev.map((item, i) => i === index ? { ...item, quantity: Math.max(1, quantity) } : item));
  };

  useEffect(() => {
    if (defaultAddOpen) {
      handleOpenRequestModal();
      if (onClearDefaultAddOpen) onClearDefaultAddOpen();
    }
  }, [defaultAddOpen]);

  const handleAddCategory = () => {
    if (!newCategoryName.trim()) {
      alert('กรุณากรอกชื่อหมวดหมู่');
      return;
    }
    const currentCats = [...supplyCategories];
    if (currentCats.some(cat => cat.toLowerCase() === newCategoryName.trim().toLowerCase())) {
      alert('หมวดหมู่นี้มีอยู่แล้วในระบบ');
      return;
    }
    const updatedCats = [...currentCats, newCategoryName.trim()];
    if (onUpdateSettings && settings) {
      onUpdateSettings({
        ...settings,
        supplyCategories: updatedCats
      });
      setNewCategoryName('');
    }
  };

  const handleEditCategory = (index: number) => {
    if (!editingCategoryName.trim()) {
      alert('กรุณากรอกชื่อหมวดหมู่');
      return;
    }
    const currentCats = [...supplyCategories];
    const oldName = currentCats[index];
    const newName = editingCategoryName.trim();

    if (oldName === newName) {
      setEditingCategoryIndex(null);
      return;
    }

    if (currentCats.some((cat, i) => i !== index && cat.toLowerCase() === newName.toLowerCase())) {
      alert('หมวดหมู่นี้มีอยู่แล้วในระบบ');
      return;
    }

    currentCats[index] = newName;

    if (onUpdateSupplyItems) {
      const updatedItems = supplyItems.map(item => {
        if (item.category === oldName) {
          return { ...item, category: newName };
        }
        return item;
      });
      onUpdateSupplyItems(updatedItems);
    }

    if (onUpdateSettings && settings) {
      onUpdateSettings({
        ...settings,
        supplyCategories: currentCats
      });
    }

    setEditingCategoryIndex(null);
    setEditingCategoryName('');
  };

  const handleDeleteCategory = (index: number) => {
    const currentCats = [...supplyCategories];
    const targetCat = currentCats[index];

    const itemsUsingCat = supplyItems.filter(item => item.category === targetCat);
    if (itemsUsingCat.length > 0) {
      askConfirm(
        'ยืนยันการลบหมวดหมู่',
        `หมวดหมู่ "${targetCat}" มีการใช้งานโดยวัสดุอุปกรณ์จำนวน ${itemsUsingCat.length} รายการ\nหากลบหมวดหมู่นี้ รายการอุปกรณ์เหล่านี้จะถูกเปลี่ยนเป็นประเภท "อื่นๆ"\n\nยืนยันที่จะลบใช่หรือไม่?`,
        () => {
          if (onUpdateSupplyItems) {
            const updatedItems = supplyItems.map(item => {
              if (item.category === targetCat) {
                return { ...item, category: 'อื่นๆ' };
              }
              return item;
            });
            onUpdateSupplyItems(updatedItems);
          }
          const updatedCats = currentCats.filter((_, i) => i !== index);
          if (onUpdateSettings && settings) {
            onUpdateSettings({
              ...settings,
              supplyCategories: updatedCats
            });
          }
        },
        true
      );
    } else {
      askConfirm(
        'ยืนยันการลบหมวดหมู่',
        `ยืนยันการลบหมวดหมู่ "${targetCat}" หรือไม่?`,
        () => {
          const updatedCats = currentCats.filter((_, i) => i !== index);
          if (onUpdateSettings && settings) {
            onUpdateSettings({
              ...settings,
              supplyCategories: updatedCats
            });
          }
        },
        true
      );
    }
  };

  // Handle open add item
  const handleOpenAddItemModal = () => {
    setFormItemName('');
    setFormCategory(supplyCategories[0] || 'เครื่องเขียน');
    setFormStock(10);
    setFormMinStock(5);
    setFormUnit('ชิ้น');
    setFormPrice(20);
    setIsAddItemModalOpen(true);
  };

  // Handle open request supply
  const handleOpenRequestModal = () => {
    if (isEmployee && currentUser?.employeeId) {
      setFormEmployeeId(currentUser.employeeId);
    } else if (employees.length > 0) {
      setFormEmployeeId(employees[0].employeeId);
    } else {
      setFormEmployeeId('');
    }

    if (supplyItems.length > 0) {
      setFormItemId(supplyItems[0].id);
      setRequestItems([{ itemId: supplyItems[0].id, quantity: 1 }]);
    } else {
      setFormItemId('');
      setRequestItems([{ itemId: '', quantity: 1 }]);
    }

    setFormQuantity(1);
    setFormPurpose('');
    setIsRequestModalOpen(true);
  };

  // Submit Add Item list
  const handleAddItemSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formItemName) {
      alert('กรุณาระบุชื่อพัสดุอุปกรณ์');
      return;
    }

    onAddSupplyItem({
      name: formItemName,
      category: formCategory,
      stock: formStock,
      minStock: formMinStock,
      unit: formUnit,
      price: formPrice
    });

    setIsAddItemModalOpen(false);
  };

  const handleOpenEditModal = (item: SupplyItem) => {
    setEditingItem(item);
    setEditFormItemName(item.name);
    setEditFormCategory(item.category);
    setEditFormStock(item.stock);
    setEditFormMinStock(item.minStock);
    setEditFormUnit(item.unit);
    setEditFormPrice(item.price);
    setIsEditItemModalOpen(true);
  };

  const handleEditItemSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;
    if (!editFormItemName) {
      alert('กรุณาระบุชื่อพัสดุอุปกรณ์');
      return;
    }

    if (onUpdateSupplyItem) {
      onUpdateSupplyItem({
        ...editingItem,
        name: editFormItemName,
        category: editFormCategory,
        stock: editFormStock,
        minStock: editFormMinStock,
        unit: editFormUnit,
        price: editFormPrice
      });
    }

    setIsEditItemModalOpen(false);
    setEditingItem(null);
  };

  const handleDeleteItem = (id: string) => {
    const itemToDelete = supplyItems.find(item => item.id === id);
    if (!itemToDelete) return;

    askConfirm(
      'ยืนยันการลบรายการพัสดุ',
      `คุณแน่ใจหรือไม่ว่าต้องการลบรายการพัสดุ "${itemToDelete.name}"? การดำเนินการนี้ไม่สามารถย้อนกลับได้`,
      () => {
        if (onDeleteSupplyItem) {
          onDeleteSupplyItem(id);
        }
      },
      true
    );
  };

  // Submit Request Supply list
  const handleRequestSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formEmployeeId) {
      alert('กรุณาเลือกชื่อพนักงานผู้รับสินค้าเบิกพัสดุ');
      return;
    }
    
    if (requestItems.length === 0) {
      alert('กรุณาเลือกอย่างน้อย 1 รายการเพื่อขอเบิก');
      return;
    }

    const matchedEmployee = employees.find(emp => emp.employeeId === formEmployeeId);
    if (!matchedEmployee) {
      alert('ไม่พบผู้ขอพัสดุในสารสนเทศพนักงาน');
      return;
    }

    const requestsToSubmit: Omit<SupplyRequest, 'id' | 'createdAt' | 'status'>[] = [];

    for (let i = 0; i < requestItems.length; i++) {
      const slot = requestItems[i];
      if (!slot.itemId) {
        alert(`กรุณาเลือกรายการสินค้าในแถวที่ ${i + 1}`);
        return;
      }

      const selectedItem = supplyItems.find(item => item.id === slot.itemId);
      if (!selectedItem) {
        alert(`ไม่พบพัสดุอุปกรณ์ที่ต้องการระบุเบิกในแถวที่ ${i + 1}`);
        return;
      }

      if (slot.quantity <= 0) {
        alert(`กรุณากรอกจำนวนเบิกให้มากกว่า 0 ในแถวที่ ${i + 1}`);
        return;
      }

      if (slot.quantity > selectedItem.stock) {
        alert(`จำนวนที่คุณขอเบิกสำหรับ "${selectedItem.name}" (${slot.quantity} ${selectedItem.unit}) เกินจำนวนคงเหลือในคลัง (${selectedItem.stock} ${selectedItem.unit})`);
        return;
      }

      requestsToSubmit.push({
        employeeId: formEmployeeId,
        employeeName: `${matchedEmployee.firstName} ${matchedEmployee.lastName}`,
        itemId: slot.itemId,
        itemName: selectedItem.name,
        quantity: slot.quantity,
        purpose: formPurpose
      });
    }

    onAddSupplyRequest(requestsToSubmit);
    setIsRequestModalOpen(false);
  };

  // Submit restock
  const handleRestockSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!restockItemId) return;
    onRestockItem(restockItemId, restockAmount);
    setRestockItemId(null);
  };

  // Get categories list
  const supplyCategories = settings?.supplyCategories || ['เครื่องเขียน', 'อุปกรณ์สำนักงาน', 'เวชภัณฑ์', 'เทคโนโลยี', 'อื่นๆ'];
  const categories = ['All', ...supplyCategories];

  // Filter Supply Items list
  const filteredItems = supplyItems.filter(item => {
    const matchesSearch = 
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      item.code.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-6" id="supply-section-container">
      {/* Header Panel */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4" id="supply-header-area">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-800 font-sans flex items-center gap-2">
            <Package className="w-6 h-6 text-blue-600" />
            {isEmployeeOnly ? 'รายการพัสดุเบิกจ่ายและใบเบิกของฉัน' : 'ระบบเบิกจ่ายและจัดการพัสดุ'}
          </h2>
          <p className="text-sm text-slate-500">
            {isEmployeeOnly ? 'ค้นหาวัสดุอุปกรณ์สำนักงานที่ให้บริการ ส่งใบขอเบิกพัสดุ และตรวจสอบสถานะรายการของคุณ' : 'จัดการข้อมูลอุปกรณ์สำนักงาน ค้นหาสินค้า และอนุมัติใบรับพัสดุของพนักงาน'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => {
              setIsScannerOpen(true);
              setScannedItem(null);
              setScanQty(1);
              setScanPurpose('');
              setScanSuccessMsg(null);
              setCameraActive(true);
            }}
            className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-4 py-2.5 rounded-xl text-sm shadow transition cursor-pointer"
          >
            <QrCode className="w-4 h-4" />
            สแกน QR Code (รับเข้า/เบิก)
          </button>
          {canManageSupplyItems && (
            <>
              <button
                onClick={() => setIsManageCategoriesModalOpen(true)}
                className="flex items-center gap-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 font-semibold px-4 py-2.5 rounded-xl text-sm shadow-xs transition cursor-pointer"
              >
                <Tags className="w-4 h-4" />
                จัดการหมวดหมู่รายการ
              </button>
              <button
                onClick={handleOpenAddItemModal}
                className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-white font-semibold px-4 py-2.5 rounded-xl text-sm shadow transition cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                เพิ่มรายการคลัง
              </button>
            </>
          )}
          <button
            onClick={handleOpenRequestModal}
            disabled={employees.length === 0 || supplyItems.length === 0}
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-300 text-white font-semibold px-4 py-2.5 rounded-xl text-sm shadow transition cursor-pointer"
          >
            <ShoppingCart className="w-4 h-4" />
            ส่งคำขอเบิกพัสดุ
          </button>
        </div>
      </div>

      {/* Internal Navigation tabs toggling inside Section container */}
      <div className="border-b border-slate-200 flex" id="supply-section-inner-navigation">
        <button
          onClick={() => setSubTab('inventory')}
          className={`px-4 py-2 text-sm font-semibold border-b-2 transition ${
            subTab === 'inventory' 
              ? 'border-blue-600 text-blue-600 font-semibold' 
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          📂 รายการวัสดุและอุปกรณ์ ({supplyItems.length})
        </button>
        <button
          onClick={() => setSubTab('requests')}
          className={`px-4 py-2 text-sm font-semibold border-b-2 transition flex items-center gap-2 ${
            subTab === 'requests' 
              ? 'border-blue-600 text-blue-600 font-semibold' 
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          📋 ประวัติและคำขอเบิกพัสดุ 
          {supplyRequests.filter(r => r.status === 'pending').length > 0 && (
            <span className="bg-amber-500 text-white px-1.5 py-0.5 rounded-full text-[10px] font-bold">
              {supplyRequests.filter(r => r.status === 'pending').length}
            </span>
          )}
        </button>
      </div>

      {subTab === 'inventory' ? (
        /* ================= INVENTORY TAB ================= */
        <div className="space-y-4" id="subtab-inventory-content">
          {/* Controls searching */}
          <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex flex-col sm:flex-row gap-4" id="inventory-filters">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="ค้นหารหัสพัสดุ หรือกลุ่มอุปกรณ์..."
                className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 focus:bg-white"
              />
            </div>
            <div className="w-full sm:w-48">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50"
              >
                {categories.map((cat, i) => (
                  <option key={i} value={cat}>
                    {cat === 'All' ? 'ทุกหมวดหมู่รายการ' : cat}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Grid display items */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" id="inventory-items-grid">
            {filteredItems.length > 0 ? (
              filteredItems.map(item => {
                const isLowStock = item.stock <= item.minStock;
                const isCritical = item.stock === 0;
                
                return (
                  <div 
                    key={item.id} 
                    className={`bg-white rounded-2xl p-5 border shadow-2xs hover:shadow-sm transition flex flex-col justify-between ${
                      isCritical
                        ? 'border-rose-400 bg-rose-50/10'
                        : isLowStock
                        ? 'border-amber-400 bg-amber-50/10'
                        : 'border-slate-100'
                    }`}
                  >
                    <div>
                      {/* Top bar category & code */}
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-mono font-bold bg-slate-200 px-2 py-0.5 rounded text-slate-600 uppercase">
                            {item.code}
                          </span>
                          <button
                            type="button"
                            onClick={() => setSelectedQRItem(item)}
                            className="p-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 transition cursor-pointer"
                            title="แสดง QR Code"
                          >
                            <QrCode className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <span className="text-xs text-blue-600 font-semibold bg-blue-50 px-2.5 py-0.5 rounded-full">
                          {item.category}
                        </span>
                      </div>

                      {/* Item Name */}
                      <h4 className="text-sm font-bold text-slate-800 font-sans line-clamp-1 mb-1">
                        {item.name}
                      </h4>

                      {/* Display warning alerts */}
                      {isCritical ? (
                        <p className="text-[11px] text-rose-600 font-semibold flex items-center gap-1 mb-3">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          สินค้าในคลังเกลี้ยง! 0 {item.unit}
                        </p>
                      ) : isLowStock ? (
                        <p className="text-[11px] text-amber-600 font-semibold flex items-center gap-1 mb-3">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          สต็อกต่ำกว่าเกณฑ์ความปลอดภัย (ต่ำกว่า {item.minStock} {item.unit})
                        </p>
                      ) : (
                        <p className="text-[11px] text-emerald-600 font-medium flex items-center gap-1 mb-3">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          คงเหลือในระบบปกติ
                        </p>
                      )}

                      {/* Metric info */}
                      <div className="grid grid-cols-2 gap-2 bg-slate-50 p-2.5 rounded-xl text-xs text-slate-500 mb-4 border border-slate-100">
                        <div>
                          <span>ราคาต่อหน่วย:</span>
                          <span className="block font-bold text-slate-700 font-mono mt-0.5">฿ {item.price.toLocaleString()} / {item.unit}</span>
                        </div>
                        <div>
                          <span>ระดับขั้นต่ำ:</span>
                          <span className="block font-semibold text-slate-600 mt-0.5">เตือนเมื่อ &lt; {item.minStock} {item.unit}</span>
                        </div>
                      </div>
                    </div>

                    {/* Bottom stock level and adjustment action */}
                    <div className="flex items-center justify-between pt-3 border-t border-slate-100 gap-2">
                      <div className="text-xs">
                        <span className="text-slate-400 block">คงเหลือปัจจุบัน</span>
                        <span className={`text-lg font-bold font-mono ${isCritical ? 'text-rose-600' : isLowStock ? 'text-amber-600' : 'text-slate-800'}`}>
                          {item.stock} {item.unit}
                        </span>
                      </div>
                      
                      {canManageSupplyItems && (
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(item)}
                            className="p-2 rounded-lg bg-slate-50 hover:bg-blue-50 text-slate-600 hover:text-blue-600 border border-slate-200 hover:border-blue-200 transition cursor-pointer"
                            title="แก้ไขข้อมูลวัสดุ"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteItem(item.id)}
                            className="p-2 rounded-lg bg-slate-50 hover:bg-rose-50 text-slate-600 hover:text-rose-600 border border-slate-200 hover:border-rose-200 transition cursor-pointer"
                            title="ลบวัสดุพัสดุ"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setRestockItemId(item.id);
                              setRestockAmount(10);
                            }}
                            className="flex items-center gap-1 text-xs font-bold text-blue-700 bg-blue-50 border border-blue-100 hover:bg-blue-100 rounded-lg px-2.5 py-1.5 transition cursor-pointer"
                          >
                            <ArrowDownToLine className="w-3.5 h-3.5" />
                            เติมสต็อก
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="col-span-full py-16 bg-white rounded-2xl border border-slate-100 text-center text-slate-400">
                <Package className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                ไม่พบข้อมูลรายการพัสดุตามที่คุณระบุค้นหาในฐานระบบ
              </div>
            )}
          </div>
        </div>
      ) : (
        /* ================= REQUESTS LIST TAB ================= */
        <div className="bg-white rounded-xl shadow border border-slate-100 overflow-hidden" id="subtab-requests-content">
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/75 border-b border-slate-100 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  <th className="px-6 py-4">ผู้ยื่นเบิกจ่าย</th>
                  <th className="px-6 py-4">พัสดุอุปกรณ์ระบุเบิก</th>
                  <th className="px-6 py-4">จำนวนใบจ่าย</th>
                  <th className="px-6 py-4">จุดประสงค์ใช้งาน</th>
                  <th className="px-6 py-4 font-mono text-center">วันที่ขอ</th>
                  <th className="px-6 py-4">สถานะ</th>
                  {!isEmployee && <th className="px-6 py-4 text-center">ดำเนินการ HR</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {(() => {
                  const myRequests = isEmployeeOnly 
                    ? supplyRequests.filter(r => r.employeeId === currentUser?.employeeId) 
                    : supplyRequests;
                  if (myRequests.length > 0) {
                    return myRequests.map(req => {
                      return (
                      <tr key={req.id} className="hover:bg-slate-50/50 transition">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center font-bold text-xs text-slate-600">
                              <User className="w-4 h-4 text-slate-400" />
                            </div>
                            <div>
                              <p className="font-semibold text-slate-800">{req.employeeName}</p>
                              <p className="text-[10px] font-mono text-slate-400">{req.employeeId}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="font-medium text-slate-700">{req.itemName}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="font-bold text-slate-800 font-mono text-xs">{req.quantity}</span>{` `}
                          <span className="text-slate-400 text-xs">(ชิ้น/ชุด)</span>
                        </td>
                        <td className="px-6 py-4 max-w-xs">
                          <p className="truncate text-xs text-slate-500" title={req.purpose}>{req.purpose}</p>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap font-mono text-center text-xs text-slate-500">
                          {req.createdAt}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                            req.status === 'approved'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                              : req.status === 'pending'
                              ? 'bg-amber-50 text-amber-700 border border-amber-100'
                              : 'bg-rose-50 text-rose-700 border border-rose-100'
                          }`}>
                            {req.status === 'approved' ? 'จ่ายครบถ้วน' : req.status === 'pending' ? 'รอคำสั่งจ่าย' : 'ใบคำขอกลับคืน'}
                          </span>
                        </td>
                        {!isEmployeeOnly && (
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            {req.status === 'pending' ? (
                              <div className="flex items-center justify-center gap-2">
                                {/* Approve supply requests and reduce the corresponding inventory items count */}
                                <button
                                  onClick={() => setActingSupplyReq({ id: req.id, action: 'approve' })}
                                  className="p-1 text-white bg-emerald-600 hover:bg-emerald-500 rounded-md transition cursor-pointer"
                                  title="อนุมัติจ่ายพัสดุ"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => setActingSupplyReq({ id: req.id, action: 'reject' })}
                                  className="p-1 text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-md transition cursor-pointer"
                                  title="ปฏิเสธคำเบิกนี้"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ) : (
                              <span className="text-slate-400 text-xs">- เรียบร้อย -</span>
                            )}
                          </td>
                        )}
                      </tr>
                    );
                  });
                } else {
                  return (
                    <tr>
                      <td colSpan={isEmployeeOnly ? 6 : 7} className="px-6 py-12 text-center text-slate-400">
                        {isEmployeeOnly ? 'คุณยังไม่มีประวัติส่งคำขอเบิกพัสดุส่วนตัวในระบบ' : 'ไม่พบประวัติใบจ่ายคืนใบเบิกพัสดุของพนักงานใดๆ'}
                      </td>
                    </tr>
                  );
                }
              })()}
              </tbody>
            </table>
          </div>

          {/* Card representation for Mobile */}
          <div className="block md:hidden divide-y divide-slate-100" id="supply-requests-display-cards-container">
            {(() => {
              const myRequests = isEmployeeOnly 
                ? supplyRequests.filter(r => r.employeeId === currentUser?.employeeId) 
                : supplyRequests;
              if (myRequests.length > 0) {
                return myRequests.map(req => (
                  <div key={req.id} className="p-4 bg-white flex flex-col gap-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center font-bold text-xs text-slate-600">
                          <User className="w-4 h-4 text-slate-400" />
                        </div>
                        <div>
                          <p className="font-bold text-slate-800 text-xs leading-none">{req.employeeName}</p>
                          <p className="text-[10px] font-mono font-medium text-slate-400 mt-1">{req.employeeId}</p>
                        </div>
                      </div>
                      <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                        req.status === 'approved'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                          : req.status === 'pending'
                          ? 'bg-amber-50 text-amber-700 border-amber-100'
                          : 'bg-rose-50 text-rose-700 border border-rose-100'
                      }`}>
                        {req.status === 'approved' ? 'จ่ายพัสดุแล้ว' : req.status === 'pending' ? 'รอคำสั่งจ่าย' : 'ปฏิเสธคำเบิก'}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100">
                      <div>
                        <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">พัสดุอุปกรณ์</span>
                        <p className="font-bold text-slate-800 mt-0.5">{req.itemName}</p>
                        <p className="text-xs text-slate-500 font-mono mt-1 font-semibold">จำนวน: <span className="text-indigo-600 font-extrabold">{req.quantity}</span> รายการ</p>
                      </div>
                      <div>
                        <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">วันที่ส่งคำขอ</span>
                        <p className="font-mono font-semibold text-slate-700 mt-0.5">{req.createdAt}</p>
                      </div>
                    </div>

                    {req.purpose && (
                      <div className="text-xs text-slate-500 leading-relaxed bg-slate-50/50 p-2.5 rounded-xl border border-slate-100/50">
                        <span className="font-bold text-slate-600">จุดประสงค์ใช้งาน:</span>
                        <p className="mt-0.5">"{req.purpose}"</p>
                      </div>
                    )}

                    {!isEmployeeOnly && req.status === 'pending' && (
                      <div className="flex items-center gap-2 pt-1" id={`supply-actions-${req.id}`}>
                        <button
                          onClick={() => setActingSupplyReq({ id: req.id, action: 'approve' })}
                          className="flex-1 flex items-center justify-center gap-1 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold py-2 rounded-xl transition cursor-pointer"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>อนุมัติสั่งจ่าย</span>
                        </button>
                        <button
                          onClick={() => setActingSupplyReq({ id: req.id, action: 'reject' })}
                          className="flex-1 flex items-center justify-center gap-1 bg-white hover:bg-slate-50 text-rose-600 border border-rose-200 text-xs font-bold py-2 rounded-xl transition cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                          <span>ปฏิเสธ</span>
                        </button>
                      </div>
                    )}
                  </div>
                ));
              } else {
                return (
                  <div className="p-8 text-center text-slate-400 text-xs">
                    {isEmployeeOnly ? 'คุณยังไม่มีประวัติส่งคำขอเบิกพัสดุส่วนตัวในระบบ' : 'ไม่พบประวัติใบจ่ายคืนใบเบิกพัสดุของพนักงานใดๆ'}
                  </div>
                );
              }
            })()}
          </div>
        </div>
      )}

      {/* MODAL: ADD INVENTORY ITEM */}
      {isAddItemModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl w-full max-w-md shadow-2xl p-6"
          >
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
              <h3 className="text-lg font-bold text-slate-800 font-sans flex items-center gap-2">
                <Package className="w-5 h-5 text-blue-600" />
                เพิ่มพัสดุอุปกรณ์เข้าคลังย่อย
              </h3>
              <button onClick={() => setIsAddItemModalOpen(false)} className="text-slate-400 p-1 hover:bg-slate-100 rounded-lg cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddItemSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">ชื่อพัสดุ/อุปกรณ์สำนักงาน *</label>
                <input
                  type="text"
                  required
                  value={formItemName}
                  onChange={(e) => setFormItemName(e.target.value)}
                  placeholder="เช่น ปากกาไวท์บอร์ดสีดำ ตราม้า"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">หมวดหมู่รายการ *</label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-1.5 focus:ring-blue-500"
                  >
                    {supplyCategories.map((cat, idx) => (
                      <option key={idx} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">หน่วยนับ *</label>
                  <input
                    type="text"
                    required
                    value={formUnit}
                    onChange={(e) => setFormUnit(e.target.value)}
                    placeholder="เช่น กล่อง/รีม/โหล"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1">สต็อกเริ่มต้น *</label>
                  <input
                    type="number"
                    min={0}
                    required
                    value={formStock}
                    onChange={(e) => setFormStock(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1">จุดต่ำสุดที่เตือน *</label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={formMinStock}
                    onChange={(e) => setFormMinStock(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1">ราคาต่อหน่วย (฿)</label>
                  <input
                    type="number"
                    min={0}
                    required
                    value={formPrice}
                    onChange={(e) => setFormPrice(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddItemModalOpen(false)}
                  className="bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 font-semibold px-4 py-2 rounded-xl text-sm"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-500 text-white font-semibold px-4 py-2 rounded-xl text-sm"
                >
                  บันทึกลงทะเบียน
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* MODAL: LOCAL CONFIRMATION */}
      {localConfirm && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-[110]">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl w-full max-w-sm shadow-2xl p-6 border border-slate-100"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className={`p-2.5 rounded-xl ${localConfirm.isDanger ? 'bg-rose-50 text-rose-600' : 'bg-blue-50 text-blue-600'}`}>
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900 font-sans">{localConfirm.title}</h3>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed font-sans mb-6">{localConfirm.message}</p>
            <div className="flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setLocalConfirm(null)}
                className="bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 font-semibold px-4 py-2 rounded-xl text-sm transition cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={() => {
                  localConfirm.onConfirm();
                  setLocalConfirm(null);
                }}
                className={`text-white font-semibold px-4 py-2 rounded-xl text-sm transition cursor-pointer ${
                  localConfirm.isDanger ? 'bg-rose-600 hover:bg-rose-500' : 'bg-blue-600 hover:bg-blue-500'
                }`}
              >
                ยืนยัน
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* MODAL: EDIT INVENTORY ITEM */}
      {isEditItemModalOpen && editingItem && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl w-full max-w-md shadow-2xl p-6"
          >
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
              <h3 className="text-lg font-bold text-slate-800 font-sans flex items-center gap-2">
                <Package className="w-5 h-5 text-blue-600" />
                แก้ไขข้อมูลพัสดุอุปกรณ์ ({editingItem.code})
              </h3>
              <button onClick={() => { setIsEditItemModalOpen(false); setEditingItem(null); }} className="text-slate-400 p-1 hover:bg-slate-100 rounded-lg cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditItemSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">ชื่อพัสดุ/อุปกรณ์สำนักงาน *</label>
                <input
                  type="text"
                  required
                  value={editFormItemName}
                  onChange={(e) => setEditFormItemName(e.target.value)}
                  placeholder="เช่น ปากกาไวท์บอร์ดสีดำ ตราม้า"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">หมวดหมู่รายการ *</label>
                  <select
                    value={editFormCategory}
                    onChange={(e) => setEditFormCategory(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-1.5 focus:ring-blue-500"
                  >
                    {supplyCategories.map((cat, idx) => (
                      <option key={idx} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">หน่วยนับ *</label>
                  <input
                    type="text"
                    required
                    value={editFormUnit}
                    onChange={(e) => setEditFormUnit(e.target.value)}
                    placeholder="เช่น กล่อง/รีม/โหล"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1">สต็อกที่มีอยู่ *</label>
                  <input
                    type="number"
                    min={0}
                    required
                    value={editFormStock}
                    onChange={(e) => setEditFormStock(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1">จุดต่ำสุดที่เตือน *</label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={editFormMinStock}
                    onChange={(e) => setEditFormMinStock(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1">ราคาต่อหน่วย (฿)</label>
                  <input
                    type="number"
                    min={0}
                    required
                    value={editFormPrice}
                    onChange={(e) => setEditFormPrice(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => { setIsEditItemModalOpen(false); setEditingItem(null); }}
                  className="bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 font-semibold px-4 py-2 rounded-xl text-sm"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-500 text-white font-semibold px-4 py-2 rounded-xl text-sm"
                >
                  บันทึกการแก้ไข
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* MODAL: SUBMIT REQUEST BILL */}
      {isRequestModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl w-full max-w-xl shadow-2xl p-6"
          >
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
              <h3 className="text-lg font-bold text-slate-800 font-sans flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-blue-600" />
                กรอกรายละเอียดการเบิกของ
              </h3>
              <button onClick={() => setIsRequestModalOpen(false)} className="text-slate-400 p-1 hover:bg-slate-100 rounded-lg cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRequestSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">เลือกผู้ยื่นคำขอเบิกพัสดุ *</label>
                <select
                  required
                  value={formEmployeeId}
                  onChange={(e) => setFormEmployeeId(e.target.value)}
                  disabled={isEmployee}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-1.5 focus:ring-blue-500 disabled:opacity-60 disabled:bg-slate-50"
                >
                  <option value="" disabled>-- กรุณาเลือกบุคลากร --</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.employeeId}>
                      {emp.firstName} {emp.lastName} ({emp.employeeId})
                    </option>
                  ))}
                </select>
                {isEmployee && (
                  <p className="text-[11px] text-slate-400 mt-1">ยื่นคำขอเบิกพัสดุในนามบัญชีส่วนบุคคลของคุณที่ทำรายการ</p>
                )}
              </div>

              <div className="space-y-3 bg-slate-50/50 p-4 rounded-xl border border-slate-100">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-700">รายการสิ่งของพัสดุอุปกรณ์ที่ต้องการเบิก *</label>
                  <button
                    type="button"
                    onClick={handleAddItemSlot}
                    className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-bold transition cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    เพิ่มพัสดุชิ้นอื่นเพิ่มเติม
                  </button>
                </div>

                <div className="space-y-3 max-h-[220px] overflow-y-auto pr-1">
                  {requestItems.map((slot, index) => {
                    const selectedItem = supplyItems.find(item => item.id === slot.itemId);
                    return (
                      <div key={index} className="flex gap-2 items-center bg-white p-2.5 rounded-xl border border-slate-200 relative group">
                        <div className="flex-1 min-w-0">
                          <label className="block text-[10px] font-bold text-slate-400 mb-0.5">รายการชิ้นที่ {index + 1}</label>
                          <select
                            required
                            value={slot.itemId}
                            onChange={(e) => handleItemSlotChange(index, e.target.value)}
                            className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1.5 focus:ring-blue-500"
                          >
                            <option value="" disabled>-- เลือกพัสดุ --</option>
                            {supplyItems.map(item => (
                              <option key={item.id} value={item.id} disabled={item.stock === 0}>
                                {item.name} ({item.code} | คงเหลือ: {item.stock} {item.unit}) {item.stock === 0 ? '[หมด]' : ''}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="w-24">
                          <label className="block text-[10px] font-bold text-slate-400 mb-0.5">
                            จำนวน {selectedItem ? `(${selectedItem.unit})` : ''}
                          </label>
                          <input
                            type="number"
                            min={1}
                            required
                            value={slot.quantity}
                            onChange={(e) => handleQuantitySlotChange(index, Number(e.target.value))}
                            className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1.5 focus:ring-blue-500"
                          />
                        </div>

                        {requestItems.length > 1 && (
                          <div className="pt-4">
                            <button
                              type="button"
                              onClick={() => handleRemoveItemSlot(index)}
                              className="text-rose-500 hover:text-rose-600 hover:bg-rose-50 p-1.5 rounded-lg transition cursor-pointer"
                              title="ลบรายการนี้"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">ความจำเป็น / วัตถุประสงค์สําหรับใช้ออฟฟิศ *</label>
                <textarea
                  required
                  rows={2}
                  value={formPurpose}
                  onChange={(e) => setFormPurpose(e.target.value)}
                  placeholder="เช่น พิมพ์เอกสารสัญญา หรือแจกจ่ายพนักงานฝ่ายบริการไอที"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsRequestModalOpen(false)}
                  className="bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 font-semibold px-4 py-2 rounded-xl text-sm"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-500 text-white font-semibold px-4 py-2 rounded-xl text-sm"
                >
                  ยื่นแบบฟอร์ม
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* MODAL: INPUT RESTOCK AMOUNT */}
      {restockItemId && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl w-full max-w-sm shadow-2xl p-6"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="text-base font-bold text-slate-800 font-sans flex items-center gap-1.5">
                <Layers className="w-5 h-5 text-blue-600" />
                เพิ่มสต็อกสิ่งของสำนักงาน
              </h3>
              <button onClick={() => setRestockItemId(null)} className="text-slate-400 p-1 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRestockSubmit} className="space-y-4">
              <p className="text-xs text-slate-500 leading-relaxed font-semibold">
                ระบุจำนวนของพัสดุที่คุณรับเข้าระบบค่ายคลังส่วนกลางเพิ่ม (จะทำยอดสะสมทบจำนวนคงเหลือตัวจริง):
              </p>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">ระบุจำนวนที่เติม *</label>
                <input
                  type="number"
                  min={1}
                  required
                  value={restockAmount}
                  onChange={(e) => setRestockAmount(Math.max(1, Number(e.target.value)))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setRestockItemId(null)}
                  className="bg-white border border-slate-200 text-slate-500 hover:text-slate-700 font-semibold px-4 py-1.5 rounded-lg text-xs"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-500 text-white font-semibold px-4 py-1.5 rounded-lg text-xs"
                >
                  เพิ่มเข้าสต็อกคงคลัง
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Custom Approve/Reject Supply Request Modal */}
      {actingSupplyReq && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs" id="supply-confirm-popup">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-2xl max-w-sm w-full shadow-2xl border border-slate-100 overflow-hidden"
            id="supply-confirm-box"
          >
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-xl ${actingSupplyReq.action === 'approve' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-650'}`}>
                  <Check className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-slate-900 font-sans">
                  {actingSupplyReq.action === 'approve' ? 'อนุมัติคำขอเบิกพัสดุ' : 'ปฏิเสธคำขอเบิกพัสดุ'}
                </h3>
              </div>
              
              <p className="text-xs text-slate-500 leading-relaxed font-sans font-medium">
                คุณต้องการ <strong className={actingSupplyReq.action === 'approve' ? 'text-emerald-600' : 'text-rose-600'}>
                  {actingSupplyReq.action === 'approve' ? 'อนุมัติใบส่งออกจ่ายพัสดุ' : 'ปฏิเสธใบจ่ายพัสดุ'}
                </strong> ใช่หรือไม่? {actingSupplyReq.action === 'approve' && 'ซึ่งสินค้าจะถูกตัดออกจากสต็อกคลังจริงโดยอัตโนมัติ'}
              </p>
              
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setActingSupplyReq(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition cursor-pointer"
                  id="supply-modal-cancel"
                >
                  ยกเลิก
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (actingSupplyReq.action === 'approve') {
                      onApproveRequest(actingSupplyReq.id);
                    } else {
                      onRejectRequest(actingSupplyReq.id);
                    }
                    setActingSupplyReq(null);
                  }}
                  className={`px-5 py-2 text-white text-xs font-semibold rounded-xl shadow-sm transition cursor-pointer ${
                    actingSupplyReq.action === 'approve'
                      ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-200'
                      : 'bg-rose-600 hover:bg-rose-550 shadow-rose-200'
                  }`}
                  id="supply-modal-ok"
                >
                  {actingSupplyReq.action === 'approve' ? 'ใช่, ยืนยันจ่ายพัสดุ' : 'ใช่, ปฏิเสธการเบิก'}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* ================= MODAL: DISPLAY ITEM QR CODE ================= */}
      {selectedQRItem && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs" id="item-qr-display-modal">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-3xl max-w-sm w-full shadow-2xl border border-slate-100 overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
              <h3 className="text-sm font-bold text-slate-800 font-sans flex items-center gap-2">
                <QrCode className="w-4 h-4 text-blue-600" />
                คิวอาร์โค้ดพัสดุอุปกรณ์
              </h3>
              <button
                type="button"
                onClick={() => setSelectedQRItem(null)}
                className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-1.5 rounded-lg transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 flex flex-col items-center text-center space-y-4">
              <div className="bg-white p-4 rounded-2xl shadow-inner border border-slate-100">
                <QRCodeSVG 
                  value={`office-supply:${selectedQRItem.id}`}
                  size={180}
                  level="H"
                  includeMargin={true}
                  id={`qr-code-svg-${selectedQRItem.id}`}
                />
              </div>

              <div>
                <span className="text-[10px] font-mono font-bold bg-blue-50 text-blue-600 px-2 py-0.5 rounded uppercase">
                  {selectedQRItem.code}
                </span>
                <h4 className="text-base font-bold text-slate-800 mt-1 font-sans">{selectedQRItem.name}</h4>
                <p className="text-xs text-slate-400 mt-0.5">หมวดหมู่: {selectedQRItem.category} | คงเหลือ: {selectedQRItem.stock} {selectedQRItem.unit}</p>
              </div>

              <p className="text-[11px] text-slate-500 bg-slate-50 p-2.5 rounded-xl border border-slate-150 leading-relaxed font-sans">
                💡 สแกน QR Code นี้ผ่านกล้องระบบเพื่อทำรายการ <strong>รับเข้าคลัง</strong> หรือ <strong>เบิกจ่ายอุปกรณ์</strong> ได้โดยอัตโนมัติ
              </p>
            </div>

            {/* Footer Actions */}
            <div className="flex gap-2 p-4 bg-slate-50 border-t border-slate-100">
              <button
                type="button"
                onClick={handlePrintQR}
                className="flex-1 flex items-center justify-center gap-1.5 bg-white hover:bg-slate-100 text-slate-700 font-semibold text-xs py-2.5 px-3 rounded-xl border border-slate-200 transition cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                พิมพ์รหัส QR
              </button>
              <button
                type="button"
                onClick={handleDownloadQR}
                className="flex-1 flex items-center justify-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs py-2.5 px-3 rounded-xl shadow-xs transition cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                ดาวน์โหลดรูปภาพ
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* ================= MODAL: QR CODE SCANNER ================= */}
      {isScannerOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/65 backdrop-blur-xs overflow-y-auto" id="qr-scanner-modal">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-100 overflow-hidden my-8"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
              <h3 className="text-sm font-bold text-slate-800 font-sans flex items-center gap-2">
                <ScanLine className="w-4 h-4 text-emerald-600" />
                ระบบสแกนคิวอาร์โค้ดพัสดุ
              </h3>
              <button
                type="button"
                onClick={() => {
                  setIsScannerOpen(false);
                  setCameraActive(false);
                  setScannedItem(null);
                  setScanSuccessMsg(null);
                }}
                className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-1.5 rounded-lg transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4">
              {!scannedItem ? (
                // VIEW 1: SCANNING VIEW
                <div className="space-y-4">
                  <div className="text-center space-y-1">
                    <p className="text-xs text-slate-500">ทาบแผ่นรหัส QR Code หน้าเลนส์กล้องของอุปกรณ์พัสดุเพื่อทำการสแกน</p>
                  </div>

                  {/* Camera Screen container */}
                  <div className="relative w-full aspect-square max-w-[260px] mx-auto overflow-hidden rounded-2xl border-2 border-emerald-500 bg-slate-950 flex flex-col items-center justify-center shadow-md">
                    {cameraActive ? (
                      <>
                        {/* Live webcam container parsed by html5-qrcode */}
                        <div id="reader" className="absolute inset-0 w-full h-full" />
                        
                        {/* Animated scanning line overlay */}
                        <div className="absolute top-0 left-0 right-0 h-0.5 bg-emerald-400 opacity-70 animate-bounce shadow-[0_0_10px_#10b981] z-10" />
                        <div className="absolute inset-0 border-2 border-dashed border-emerald-400/30 m-6 rounded-lg pointer-events-none z-10" />
                      </>
                    ) : (
                      <div className="flex flex-col items-center justify-center text-slate-500 p-4 space-y-3">
                        <Camera className="w-10 h-10 text-slate-600" />
                        <p className="text-xs text-slate-400 text-center font-medium">ปิดใช้งานกล้องอยู่ขณะนี้</p>
                        <button
                          type="button"
                          onClick={() => setCameraActive(true)}
                          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs rounded-xl shadow-xs transition cursor-pointer"
                        >
                          เปิดการทำงานกล้องสแกน
                        </button>
                      </div>
                    )}
                  </div>

                  {cameraError && (
                    <div className="p-3 bg-rose-50 rounded-xl border border-rose-100 text-[11px] text-rose-600 text-center leading-relaxed font-medium">
                      ❌ {cameraError}
                    </div>
                  )}

                  {/* Simulator option - essential fallback for testing environment */}
                  <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 text-center">
                    <div className="flex items-center justify-center gap-1 text-xs font-bold text-slate-700 mb-1.5">
                      <Sparkles className="w-4 h-4 text-amber-500 animate-pulse" />
                      <span>🧪 ตัวจำลองการสแกน (สำหรับทดสอบระบบ)</span>
                    </div>
                    <p className="text-[10px] text-slate-400 mb-3 leading-relaxed">
                      ท่านสามารถคลิกจำลองเสมือนสแกนคิวอาร์โค้ดพัสดุชิ้นที่ต้องการ เพื่อตรวจสอบระบบรับเข้า-เบิกจ่ายได้ทันที
                    </p>
                    <div className="flex flex-wrap gap-1 bg-white p-2 rounded-xl border border-slate-200/60 max-h-[140px] overflow-y-auto pr-1 justify-center">
                      {supplyItems.map(item => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => {
                            setScannedItem(item);
                            setScanQty(1);
                            setScanPurpose('');
                            setScanSuccessMsg(null);
                            setCameraActive(false);
                          }}
                          className="text-[10px] bg-slate-50 hover:bg-blue-50 hover:text-blue-600 text-slate-700 font-bold px-2 py-1.5 rounded-lg border border-slate-200 hover:border-blue-200 transition cursor-pointer"
                        >
                          🎯 สแกน: {item.name}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                // VIEW 2: PRODUCT SCANNED / ACTIONS PANEL
                <div className="space-y-4">
                  {/* Scanned Card */}
                  <div className="bg-emerald-50/50 p-4 rounded-2xl border border-emerald-100/60 flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center border border-slate-100 text-slate-400 font-bold font-mono text-xs">
                      {scannedItem.code}
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-[9px] font-bold uppercase bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                        สแกนพบสินค้าในระบบสำเร็จ
                      </span>
                      <h4 className="text-sm font-bold text-slate-800 mt-1 truncate">{scannedItem.name}</h4>
                      <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500">
                        <span>หมวดหมู่: {scannedItem.category}</span>
                        <span>•</span>
                        <span className="font-bold text-slate-700">สต็อกคงเหลือ: {scannedItem.stock} {scannedItem.unit}</span>
                      </div>
                    </div>
                  </div>

                  {/* Status update banner */}
                  {scanSuccessMsg ? (
                    <div className="p-4 bg-emerald-500 text-white rounded-2xl border border-emerald-600 flex items-center gap-3 shadow-inner">
                      <CheckCircle className="w-8 h-8 flex-shrink-0 animate-bounce" />
                      <div>
                        <h5 className="font-bold text-xs">ทำรายการสำเร็จเรียบร้อย!</h5>
                        <p className="text-[10px] opacity-90 mt-0.5">{scanSuccessMsg}</p>
                      </div>
                    </div>
                  ) : (
                    // Split forms: RESTOCK OR WITHDRAW
                    <form onSubmit={handleScanActionSubmit} className="space-y-4">
                      {/* Tabs selector */}
                      <div className="grid grid-cols-2 bg-slate-100 p-1 rounded-xl">
                        {!isEmployee && (
                          <button
                            type="button"
                            onClick={() => {
                              setScannerMode('restock');
                              setScanQty(10);
                            }}
                            className={`py-2 text-xs font-bold rounded-lg transition ${
                              scannerMode === 'restock'
                                ? 'bg-white text-slate-800 shadow-sm'
                                : 'text-slate-500 hover:text-slate-800'
                            }`}
                          >
                            📥 รับเข้าพัสดุ
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            setScannerMode('withdraw');
                            setScanQty(1);
                          }}
                          className={`py-2 text-xs font-bold rounded-lg transition ${
                            scannerMode === 'withdraw'
                              ? 'bg-white text-slate-800 shadow-sm'
                              : 'text-slate-500 hover:text-slate-800'
                          } ${isEmployee ? 'col-span-2' : ''}`}
                        >
                          📤 เบิกออกพัสดุ
                        </button>
                      </div>

                      {/* Content Form fields depending on selected mode */}
                      <div className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-150">
                        {scannerMode === 'restock' ? (
                          // Form 1: RESTOCK
                          <div>
                            <label className="block text-[11px] font-bold text-slate-600 mb-1">ระบุจำนวนที่รับพัสดุเข้าคลัง ({scannedItem.unit}) *</label>
                            <input
                              type="number"
                              min={1}
                              required
                              value={scanQty}
                              onChange={(e) => setScanQty(Number(e.target.value))}
                              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-1.5 focus:ring-blue-500 font-mono font-bold"
                            />
                            <p className="text-[10px] text-slate-400 mt-1.5">สต็อกในระบบพัสดุจะถูกบวกเพิ่มจากยอดเดิม ({scannedItem.stock} + {scanQty || 0} = {scannedItem.stock + (scanQty || 0)} {scannedItem.unit})</p>
                          </div>
                        ) : (
                          // Form 2: WITHDRAW
                          <div className="space-y-3">
                            <div>
                              <label className="block text-[11px] font-bold text-slate-600 mb-1">พนักงานผู้ขอเบิกจ่ายสินค้า *</label>
                              {isEmployee ? (
                                <input
                                  type="text"
                                  disabled
                                  value={`${employees.find(emp => emp.employeeId === scanEmployeeId)?.firstName || ''} ${employees.find(emp => emp.employeeId === scanEmployeeId)?.lastName || ''} (${scanEmployeeId})`}
                                  className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl text-xs text-slate-500 font-medium"
                                />
                              ) : (
                                <select
                                  required
                                  value={scanEmployeeId}
                                  onChange={(e) => setScanEmployeeId(e.target.value)}
                                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-1.5 focus:ring-blue-500"
                                >
                                  <option value="" disabled>-- กรุณาเลือกพนักงาน --</option>
                                  {employees.map(emp => (
                                    <option key={emp.id} value={emp.employeeId}>
                                      {emp.firstName} {emp.lastName} ({emp.position} | รหัส: {emp.employeeId})
                                    </option>
                                  ))}
                                </select>
                              )}
                            </div>

                            <div>
                              <label className="block text-[11px] font-bold text-slate-600 mb-1">ระบุจำนวนที่ต้องการเบิกจ่าย *</label>
                              <input
                                type="number"
                                min={1}
                                max={scannedItem.stock}
                                required
                                value={scanQty}
                                onChange={(e) => setScanQty(Number(e.target.value))}
                                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-1.5 focus:ring-blue-500 font-mono font-bold"
                              />
                              {scannedItem.stock === 0 ? (
                                <p className="text-[10px] text-rose-600 font-semibold mt-1">⚠️ ขณะนี้สินค้าหมด ไม่สามารถทำรายการขอเบิกจ่ายได้</p>
                              ) : (
                                <p className="text-[10px] text-slate-400 mt-1">คงเหลือในคลังเบิก: {scannedItem.stock} {scannedItem.unit} (จำกัดไม่เกินจำนวนคงเหลือ)</p>
                              )}
                            </div>

                            <div>
                              <label className="block text-[11px] font-bold text-slate-600 mb-1">ระบุจุดประสงค์การนำไปใช้งาน *</label>
                              <input
                                type="text"
                                required
                                placeholder="เช่น นำไปใช้งานต้อนรับผู้รับการอบรม, เปลี่ยนทดแทนชิ้นเดิมที่ชำรุด..."
                                value={scanPurpose}
                                onChange={(e) => setScanPurpose(e.target.value)}
                                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-1.5 focus:ring-blue-500"
                              />
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setScannedItem(null);
                            setCameraActive(true);
                          }}
                          className="flex-1 py-2.5 bg-slate-150 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition cursor-pointer"
                        >
                          สแกนใหม่
                        </button>
                        <button
                          type="submit"
                          disabled={scannerMode === 'withdraw' && scannedItem.stock === 0}
                          className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-300 text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer"
                        >
                          {scannerMode === 'restock' ? '📥 บันทึกรับเข้าคลัง' : '📤 ยื่นขอเบิกพัสดุ'}
                        </button>
                      </div>
                    </form>
                  )}

                  {/* Reset Scan Trigger */}
                  {scanSuccessMsg && (
                    <div className="flex gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          setScannedItem(null);
                          setScanSuccessMsg(null);
                          setCameraActive(true);
                        }}
                        className="w-full flex items-center justify-center gap-1.5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer"
                      >
                        <RefreshCw className="w-4 h-4" />
                        สแกนหรือทำรายการถัดไป
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer Close */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => {
                  setIsScannerOpen(false);
                  setCameraActive(false);
                  setScannedItem(null);
                  setScanSuccessMsg(null);
                }}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-semibold text-xs rounded-xl transition cursor-pointer"
              >
                เสร็จสิ้น / ปิดหน้าต่าง
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* MODAL: MANAGE CATEGORIES */}
      {isManageCategoriesModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <Tags className="w-5 h-5 text-indigo-600" />
                <div>
                  <h3 className="text-base font-bold text-slate-800 font-sans">จัดการหมวดหมู่รายการ</h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">เพิ่ม ลบ หรือแก้ไขชื่อหมวดหมู่ที่ใช้งานในระบบคลังพัสดุ</p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => {
                  setIsManageCategoriesModalOpen(false);
                  setEditingCategoryIndex(null);
                }} 
                className="text-slate-400 p-1 hover:bg-slate-200 rounded-lg cursor-pointer transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-5 space-y-4 max-h-[60vh] overflow-y-auto">
              {/* Form to Add New Category */}
              <div className="bg-indigo-50/50 p-4 rounded-xl border border-indigo-100 space-y-2">
                <label className="block text-xs font-bold text-indigo-950">เพิ่มหมวดหมู่ใหม่</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    placeholder="ระบุชื่อหมวดหมู่ใหม่..."
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddCategory();
                      }
                    }}
                    className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-1.5 focus:ring-indigo-500"
                  />
                  <button
                    type="button"
                    onClick={handleAddCategory}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs px-4 py-2 rounded-xl transition flex items-center gap-1 cursor-pointer shadow-xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>เพิ่ม</span>
                  </button>
                </div>
              </div>

              {/* List of existing categories */}
              <div className="space-y-2.5">
                <label className="block text-xs font-bold text-slate-600">รายการหมวดหมู่ทั้งหมด ({supplyCategories.length})</label>
                <div className="space-y-2">
                  {supplyCategories.map((cat, index) => {
                    const isEditing = editingCategoryIndex === index;
                    const itemsCount = supplyItems.filter(item => item.category === cat).length;

                    return (
                      <div 
                        key={index} 
                        className="flex items-center justify-between p-3 bg-white border border-slate-100 rounded-xl shadow-2xs hover:bg-slate-50/50 transition gap-3"
                      >
                        {isEditing ? (
                          <div className="flex flex-1 gap-1.5 items-center">
                            <input
                              type="text"
                              value={editingCategoryName}
                              onChange={(e) => setEditingCategoryName(e.target.value)}
                              className="flex-1 px-2.5 py-1.5 bg-white border border-indigo-300 rounded-lg text-xs focus:outline-none focus:ring-1.5 focus:ring-indigo-500 font-medium"
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  handleEditCategory(index);
                                } else if (e.key === 'Escape') {
                                  setEditingCategoryIndex(null);
                                }
                              }}
                            />
                            <button
                              type="button"
                              onClick={() => handleEditCategory(index)}
                              className="p-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition cursor-pointer"
                              title="บันทึก"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingCategoryIndex(null)}
                              className="p-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg transition cursor-pointer"
                              title="ยกเลิก"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <>
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="text-xs font-bold text-slate-800 truncate">{cat}</span>
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold bg-slate-100 text-slate-500 font-sans border border-slate-150">
                                {itemsCount} รายการพัสดุ
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 flex-shrink-0">
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingCategoryIndex(index);
                                  setEditingCategoryName(cat);
                                }}
                                className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                                title="แก้ไขชื่อหมวดหมู่"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteCategory(index)}
                                className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                                title="ลบหมวดหมู่"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => {
                  setIsManageCategoriesModalOpen(false);
                  setEditingCategoryIndex(null);
                }}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs rounded-xl transition cursor-pointer"
              >
                ปิดหน้าต่าง
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
