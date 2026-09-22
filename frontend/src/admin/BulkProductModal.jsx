import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  Upload, X, Check, AlertCircle, RefreshCw, CheckCircle2, 
  Trash2, Copy, Sparkles, Sliders, ArrowRight, ArrowLeft, 
  Layers, AlertTriangle, CheckSquare, Square
} from 'lucide-react';
import { adminAPI } from '../api';
import { STUDENT_VISIBLE_CATEGORIES } from '../config/constants';

// Unit options for fast entry
const UNIT_OPTIONS = [
  { value: 'kg', label: 'kg (Kilogram)' },
  { value: 'g', label: 'g (Gram)' },
  { value: 'piece', label: 'piece (Single)' },
  { value: 'pack', label: 'pack (Packet)' },
  { value: 'box', label: 'box (Box)' },
  { value: 'bottle', label: 'bottle (Bottle)' },
  { value: 'strip', label: 'strip (Medicine Strip)' },
  { value: 'dozen', label: 'dozen (12 items)' },
  { value: 'item', label: 'item (General)' },
];

// Helper to convert filename into clean Title Case product name
export const formatFilenameToTitle = (filename) => {
  if (!filename) return '';
  // Remove file extension
  let name = filename.replace(/\.[^/.]+$/, '');
  // Replace underscores, hyphens, pluses, dots with spaces
  name = name.replace(/[-_+.]+/g, ' ');
  // Remove common camera/temp prefixes like IMG_, DSC_, etc.
  name = name.replace(/^(img|dsc|photo|image|pic)[\s_0-9]+/i, '');
  // Trim and collapse multiple spaces
  name = name.replace(/\s+/g, ' ').trim();
  // Capitalize each word
  return name.replace(/\b\w/g, (char) => char.toUpperCase());
};

// Client-side Canvas WebP image compression
const compressImageToWebP = (file) => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 1600;
        const MAX_HEIGHT = 1600;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              resolve(file); // fallback to original file
              return;
            }
            const webpName = file.name.replace(/\.[^/.]+$/, '') + '.webp';
            const compressedFile = new File([blob], webpName, {
              type: 'image/webp',
              lastModified: Date.now(),
            });
            resolve(compressedFile);
          },
          'image/webp',
          0.8
        );
      };
      img.onerror = () => resolve(file);
    };
    reader.onerror = () => resolve(file);
  });
};

const BulkProductModal = ({ isOpen, onClose, onSuccess, existingProducts = [] }) => {
  const [step, setStep] = useState('select'); // 'select' | 'configure' | 'review' | 'saving' | 'result'
  const [items, setItems] = useState([]); // Array of Product Draft Objects
  const [selectedItemIds, setSelectedItemIds] = useState(new Set());
  
  // Fast Entry / Bulk Apply Bar States
  const [bulkCategory, setBulkCategory] = useState(STUDENT_VISIBLE_CATEGORIES[0]);
  const [bulkUnit, setBulkUnit] = useState('kg');
  const [bulkStock, setBulkStock] = useState('50');
  const [bulkBrand, setBulkBrand] = useState('');

  // Overall saving & progress
  const [saveProgress, setSaveProgress] = useState({ current: 0, total: 0, phase: '' });
  const [saveResults, setSaveResults] = useState(null);
  const [allowDuplicates, setAllowDuplicates] = useState(false);

  // Unsaved changes confirmation dialog
  const [showExitConfirm, setShowExitConfirm] = useState(false);

  const fileInputRef = useRef(null);

  // Cleanup object URLs on unmount or reset
  useEffect(() => {
    return () => {
      items.forEach((item) => {
        if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
      });
    };
  }, []);

  // Check if there are unsaved changes
  const hasUnsavedChanges = items.length > 0 && step !== 'result';

  const handleAttemptClose = () => {
    if (hasUnsavedChanges) {
      setShowExitConfirm(true);
    } else {
      resetAndClose();
    }
  };

  const resetAndClose = () => {
    items.forEach((item) => {
      if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
    });
    setItems([]);
    setSelectedItemIds(new Set());
    setStep('select');
    setSaveResults(null);
    setShowExitConfirm(false);
    onClose();
  };

  // 1. Multi-File Selection Handler
  const handleFilesSelected = (fileList) => {
    if (!fileList || fileList.length === 0) return;

    const newFiles = Array.from(fileList);
    const validExtensions = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];

    const newItems = newFiles
      .filter((file) => validExtensions.includes(file.type) || /\.(png|jpe?g|webp)$/i.test(file.name))
      .map((file, idx) => {
        const generatedTitle = formatFilenameToTitle(file.name);
        const previewUrl = URL.createObjectURL(file);
        const uniqueId = `item_${Date.now()}_${Math.random().toString(36).substring(2, 9)}_${idx}`;

        return {
          id: uniqueId,
          file,
          filename: file.name,
          previewUrl,
          name: generatedTitle,
          category: STUDENT_VISIBLE_CATEGORIES[0],
          price: '',
          mrp: '',
          discount: '0',
          stock: '50',
          unit: 'kg',
          brand: '',
          description: generatedTitle,
          deliveryTime: 'Scheduled Delivery',
          isAvailable: true,
          // Image upload status
          uploadStatus: 'idle', // 'idle' | 'uploading' | 'uploaded' | 'failed'
          uploadProgress: 0,
          uploadedData: null, // { image, imageOriginal, imageMedium, imageThumb }
          uploadError: '',
        };
      });

    setItems((prev) => [...prev, ...newItems]);
    // Auto-select all newly added items
    setSelectedItemIds((prev) => {
      const updated = new Set(prev);
      newItems.forEach((it) => updated.add(it.id));
      return updated;
    });
  };

  const handleRemoveItem = (id) => {
    setItems((prev) => {
      const target = prev.find((it) => it.id === id);
      if (target?.previewUrl) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((it) => it.id !== id);
    });
    setSelectedItemIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  const handleClearAll = () => {
    items.forEach((item) => {
      if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
    });
    setItems([]);
    setSelectedItemIds(new Set());
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // 2. Field Change Handler for Individual Item
  const handleItemFieldChange = (id, field, value) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const updated = { ...item, [field]: value };
        
        // Auto-sync description if it was matching old name
        if (field === 'name' && (!item.description || item.description === item.name)) {
          updated.description = value;
        }
        
        return updated;
      })
    );
  };

  // 3. Fast Bulk Operations (Apply to All / Selected)
  const handleApplyToAllOrSelected = (field, value, targetOnlySelected = false) => {
    setItems((prev) =>
      prev.map((item) => {
        if (targetOnlySelected && !selectedItemIds.has(item.id)) return item;
        return { ...item, [field]: value };
      })
    );
  };

  // Auto-fill Product Titles using standard filename formatting
  const handleGenerateNamesFromFilenames = () => {
    setItems((prev) =>
      prev.map((item) => {
        const title = formatFilenameToTitle(item.filename);
        return {
          ...item,
          name: title,
          description: (!item.description || item.description === item.name) ? title : item.description,
        };
      })
    );
  };

  const handleDuplicateDetailsToAll = (sourceItem) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id === sourceItem.id) return item;
        return {
          ...item,
          category: sourceItem.category,
          unit: sourceItem.unit,
          stock: sourceItem.stock,
          brand: sourceItem.brand,
          price: item.price || sourceItem.price,
          mrp: item.mrp || sourceItem.mrp,
        };
      })
    );
  };

  // Item Selection toggles
  const handleToggleSelectItem = (id) => {
    setSelectedItemIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleToggleSelectAll = () => {
    if (selectedItemIds.size === items.length) {
      setSelectedItemIds(new Set());
    } else {
      setSelectedItemIds(new Set(items.map((it) => it.id)));
    }
  };

  const handleRemoveSelected = () => {
    if (selectedItemIds.size === 0) return;
    setItems((prev) => {
      const remaining = [];
      prev.forEach((it) => {
        if (selectedItemIds.has(it.id)) {
          if (it.previewUrl) URL.revokeObjectURL(it.previewUrl);
        } else {
          remaining.push(it);
        }
      });
      return remaining;
    });
    setSelectedItemIds(new Set());
  };

  // 4. Validation Engine
  const validateItem = (item) => {
    const errors = [];
    if (!item.name || !item.name.trim()) errors.push('Product name is required');
    if (!item.category || !STUDENT_VISIBLE_CATEGORIES.includes(item.category)) errors.push('Valid category required');
    if (item.price === '' || isNaN(Number(item.price)) || Number(item.price) < 0) errors.push('Valid base price required');
    if (item.stock === '' || isNaN(Number(item.stock)) || Number(item.stock) < 0 || !Number.isInteger(Number(item.stock))) errors.push('Valid integer stock required');
    
    // Duplicate warning against existing catalog
    const norm = (item.name || '').trim().toLowerCase();
    const isExistingDuplicate = existingProducts.some(
      (ep) => (ep.name || '').trim().toLowerCase() === norm
    );
    if (isExistingDuplicate) {
      errors.push(`Name already exists in catalog`);
    }

    return {
      isValid: errors.length === 0,
      errors,
      isDuplicate: isExistingDuplicate,
    };
  };

  const validationSummary = useMemo(() => {
    let readyCount = 0;
    let errorCount = 0;
    let duplicateCount = 0;
    const categoryCounts = {};
    STUDENT_VISIBLE_CATEGORIES.forEach((cat) => { categoryCounts[cat] = 0; });
    let totalStockVal = 0;

    items.forEach((item) => {
      const { isValid, isDuplicate } = validateItem(item);
      if (isValid) readyCount++;
      else errorCount++;
      if (isDuplicate) duplicateCount++;

      if (categoryCounts[item.category] !== undefined) {
        categoryCounts[item.category]++;
      }
      const price = Number(item.price) || 0;
      const stock = Number(item.stock) || 0;
      totalStockVal += price * stock;
    });

    return {
      total: items.length,
      readyCount,
      errorCount,
      duplicateCount,
      categoryCounts,
      totalStockVal,
    };
  }, [items, existingProducts]);

  // 5. Parallel Image Upload Engine (Concurrency limit = 4)
  const uploadSingleImage = async (item) => {
    if (item.uploadedData?.imageMedium) {
      return item.uploadedData; // already uploaded
    }

    setItems((prev) =>
      prev.map((it) => (it.id === item.id ? { ...it, uploadStatus: 'uploading', uploadError: '' } : it))
    );

    try {
      // Step A: Client-side compression
      const compressed = await compressImageToWebP(item.file);
      
      // Step B: Form data packaging
      const formData = new FormData();
      formData.append('image', compressed);

      // Step C: API upload
      const res = await adminAPI.uploadImage(formData);
      const uploadedData = {
        image: res.data.imageMedium || res.data.image,
        imageOriginal: res.data.imageOriginal,
        imageMedium: res.data.imageMedium,
        imageThumb: res.data.imageThumb,
      };

      setItems((prev) =>
        prev.map((it) =>
          it.id === item.id
            ? { ...it, uploadStatus: 'uploaded', uploadedData, uploadError: '' }
            : it
        )
      );
      return uploadedData;
    } catch (err) {
      const errMsg = err.response?.data?.message || err.message || 'Image upload failed';
      setItems((prev) =>
        prev.map((it) =>
          it.id === item.id
            ? { ...it, uploadStatus: 'failed', uploadError: errMsg }
            : it
        )
      );
      throw new Error(errMsg, { cause: err });
    }
  };

  const uploadAllImagesWithConcurrency = async (itemsList, concurrencyLimit = 4) => {
    const results = new Map();
    let index = 0;

    setSaveProgress({ current: 0, total: itemsList.length, phase: 'Uploading Images...' });

    const worker = async () => {
      while (index < itemsList.length) {
        const currentIndex = index++;
        const currentItem = itemsList[currentIndex];
        try {
          const data = await uploadSingleImage(currentItem);
          results.set(currentItem.id, { success: true, data });
        } catch (err) {
          results.set(currentItem.id, { success: false, error: err.message });
        }
        setSaveProgress((prev) => ({
          ...prev,
          current: Math.min(prev.total, prev.current + 1),
        }));
      }
    };

    const workers = Array.from({ length: Math.min(concurrencyLimit, itemsList.length) }, () => worker());
    await Promise.all(workers);
    return results;
  };

  // 6. Save All Products Execution
  const handleExecuteSaveAll = async () => {
    setStep('saving');

    // Phase 1: Upload images in parallel
    const uploadMap = await uploadAllImagesWithConcurrency(items, 4);

    // Phase 2: Format products payload
    setSaveProgress({ current: 0, total: items.length, phase: 'Saving Products in Catalog...' });

    const payloadProducts = items.map((item) => {
      const uploadRes = uploadMap.get(item.id);
      const imgData = uploadRes?.success ? uploadRes.data : item.uploadedData;
      
      const priceNum = Number(item.price) || 0;
      const mrpNum = item.mrp !== '' && !isNaN(Number(item.mrp)) ? Number(item.mrp) : priceNum;
      const discountNum = Number(item.discount) || 0;
      const stockNum = Number(item.stock) || 0;

      // Append unit to description if present
      let formattedDesc = item.description || item.name;
      if (item.unit && !formattedDesc.toLowerCase().includes(item.unit.toLowerCase())) {
        formattedDesc += ` (Unit: ${item.unit})`;
      }

      return {
        id: item.id,
        name: item.name.trim(),
        category: item.category,
        price: priceNum,
        mrp: mrpNum,
        discount: discountNum,
        stock: stockNum,
        brand: item.brand.trim(),
        description: formattedDesc,
        deliveryTime: item.deliveryTime || 'Scheduled Delivery',
        isAvailable: item.isAvailable,
        image: imgData?.imageMedium || imgData?.image || '/uploads/default-product.png',
        imageOriginal: imgData?.imageOriginal,
        imageMedium: imgData?.imageMedium,
        imageThumb: imgData?.imageThumb,
      };
    });

    try {
      const { data } = await adminAPI.bulkAddProducts({
        products: payloadProducts,
        allowDuplicates,
      });

      setSaveResults(data);
      setStep('result');
      if (onSuccess) {
        onSuccess(data);
      }
    } catch (err) {
      setSaveResults({
        success: false,
        summary: {
          total: items.length,
          successCount: 0,
          failedCount: items.length,
        },
        created: [],
        failed: items.map((it, idx) => ({
          index: idx + 1,
          name: it.name,
          error: err.response?.data?.message || 'Bulk creation failed',
        })),
        duplicateWarnings: [],
      });
      setStep('result');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-2 sm:p-4 bg-slate-900/70 backdrop-blur-sm animate-fade-in overflow-y-auto">
      
      {/* Unsaved changes prompt overlay */}
      {showExitConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
          <div className="bg-white p-6 rounded-3xl max-w-sm w-full shadow-2xl border border-slate-100 space-y-4 text-center">
            <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
              <AlertTriangle size={24} />
            </div>
            <h3 className="text-sm font-extrabold text-slate-800">Unsaved Bulk Products</h3>
            <p className="text-xs text-slate-500 font-semibold leading-relaxed">
              You have {items.length} product drafts in progress. Closing now will discard your configuration.
            </p>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowExitConfirm(false)}
                className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-50"
              >
                Stay & Continue
              </button>
              <button
                type="button"
                onClick={resetAndClose}
                className="flex-1 py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md"
              >
                Discard & Leave
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Bulk Modal Card */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-2xl w-full max-w-7xl max-h-[92vh] flex flex-col overflow-hidden my-auto">
        
        {/* Header Bar */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-primary-50 text-primary-600 flex items-center justify-center font-bold">
              <Layers size={18} />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
                Bulk Add Products
                {items.length > 0 && (
                  <span className="text-[10px] bg-primary-100 text-primary-800 font-black px-2 py-0.5 rounded-full">
                    {items.length} items
                  </span>
                )}
              </h2>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                Multi-image selection & fast product creation
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Step navigation tabs */}
            {items.length > 0 && step !== 'saving' && step !== 'result' && (
              <div className="hidden sm:flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setStep('select')}
                  className={`px-3 py-1.5 rounded-lg transition-all ${
                    step === 'select' ? 'bg-white text-primary-700 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  1. Images ({items.length})
                </button>
                <button
                  type="button"
                  onClick={() => setStep('configure')}
                  className={`px-3 py-1.5 rounded-lg transition-all ${
                    step === 'configure' ? 'bg-white text-primary-700 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  2. Details
                </button>
                <button
                  type="button"
                  onClick={() => setStep('review')}
                  className={`px-3 py-1.5 rounded-lg transition-all ${
                    step === 'review' ? 'bg-white text-primary-700 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  3. Review
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={handleAttemptClose}
              className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
              title="Close"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Modal Body Container */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">

          {/* ======================================================== */}
          {/* STEP 1: SELECT IMAGES                                    */}
          {/* ======================================================== */}
          {step === 'select' && (
            <div className="space-y-6">
              {/* Native multi-file picker dropzone */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-200 hover:border-primary-500 hover:bg-primary-50/20 rounded-3xl p-8 sm:p-12 text-center cursor-pointer transition-all duration-200 group flex flex-col items-center justify-center space-y-3"
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  multiple
                  accept="image/png,image/jpeg,image/jpg,image/webp"
                  className="hidden"
                  onChange={(e) => handleFilesSelected(e.target.files)}
                />

                <div className="w-16 h-16 rounded-3xl bg-primary-50 group-hover:bg-primary-100 text-primary-600 flex items-center justify-center shadow-inner transition-transform group-hover:scale-105">
                  <Upload size={28} />
                </div>

                <div className="space-y-1 max-w-sm">
                  <h3 className="text-sm font-extrabold text-slate-800 group-hover:text-primary-800">
                    Select Product Images
                  </h3>
                  <p className="text-xs text-slate-450 font-medium leading-relaxed">
                    Click to browse or drop multiple PNG, JPG, or WebP images from your computer folder.
                  </p>
                </div>

                <button
                  type="button"
                  className="btn-primary text-xs py-2 px-5 rounded-xl shadow-md pointer-events-none mt-2"
                >
                  Choose Images
                </button>
              </div>

              {/* Selected Images Grid & Controls */}
              {items.length > 0 && (
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-slate-700">
                        Selected: <span className="text-primary-600 font-black">{items.length} images</span>
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="text-xs font-bold text-primary-600 hover:underline px-2 py-1"
                      >
                        + Add More Images
                      </button>
                      <button
                        type="button"
                        onClick={handleClearAll}
                        className="text-xs font-bold text-rose-600 hover:underline px-2 py-1"
                      >
                        Clear All
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3 max-h-72 overflow-y-auto pr-1">
                    {items.map((item, idx) => (
                      <div
                        key={item.id}
                        className="relative group bg-slate-50 border border-slate-100 rounded-2xl p-2 flex flex-col items-center space-y-1.5 shadow-sm"
                      >
                        <div className="w-full aspect-square bg-white rounded-xl overflow-hidden border border-slate-200/50 flex items-center justify-center shadow-inner">
                          <img
                            src={item.previewUrl}
                            alt={item.filename}
                            className="w-full h-full object-contain"
                          />
                        </div>
                        <span className="text-[10px] font-bold text-slate-700 truncate w-full text-center leading-tight">
                          #{idx + 1} {item.filename}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(item.id)}
                          className="absolute -top-1.5 -right-1.5 w-6 h-6 bg-rose-600 hover:bg-rose-700 text-white rounded-full flex items-center justify-center shadow-md transition-transform hover:scale-110 opacity-80 group-hover:opacity-100"
                          title="Remove image"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ======================================================== */}
          {/* STEP 2: CONFIGURE PRODUCTS                               */}
          {/* ======================================================== */}
          {step === 'configure' && (
            <div className="space-y-6">
              
              {/* Fast Bulk Apply Toolbar */}
              <div className="bg-primary-50/70 border border-primary-150 rounded-2xl p-4 space-y-3 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-primary-100 pb-2">
                  <div className="flex items-center gap-2">
                    <Sliders size={15} className="text-primary-700" />
                    <span className="text-xs font-black text-primary-900 uppercase tracking-wide">
                      Fast Data Entry Toolbar (Apply to All / Selected)
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleGenerateNamesFromFilenames}
                      className="bg-white border border-primary-200 hover:bg-primary-100/50 text-primary-800 text-[10px] font-black px-3 py-1.5 rounded-xl flex items-center gap-1 shadow-sm transition-all"
                      title="Convert royal-gala-apple.jpg to Royal Gala Apple"
                    >
                      <Sparkles size={12} className="text-primary-600" />
                      <span>Generate Names From Filenames</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleToggleSelectAll}
                      className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-[10px] font-bold px-2.5 py-1.5 rounded-xl flex items-center gap-1 shadow-sm"
                    >
                      {selectedItemIds.size === items.length ? <CheckSquare size={12} /> : <Square size={12} />}
                      <span>{selectedItemIds.size === items.length ? 'Deselect All' : 'Select All'}</span>
                    </button>
                    {selectedItemIds.size > 0 && selectedItemIds.size < items.length && (
                      <button
                        type="button"
                        onClick={handleRemoveSelected}
                        className="bg-rose-50 border border-rose-200 hover:bg-rose-100 text-rose-700 text-[10px] font-bold px-2.5 py-1.5 rounded-xl flex items-center gap-1 shadow-sm"
                      >
                        <Trash2 size={12} />
                        <span>Remove Selected ({selectedItemIds.size})</span>
                      </button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 text-xs">
                  {/* Category Fast Apply */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-500 uppercase block">Category</label>
                    <div className="flex gap-1">
                      <select
                        value={bulkCategory}
                        onChange={(e) => setBulkCategory(e.target.value)}
                        className="flex-1 bg-white border border-slate-200 rounded-xl px-2 py-1 text-xs font-bold text-slate-800 outline-none"
                      >
                        {STUDENT_VISIBLE_CATEGORIES.map((cat) => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => handleApplyToAllOrSelected('category', bulkCategory)}
                        className="bg-primary-600 hover:bg-primary-700 text-white font-bold text-[10px] px-2 py-1 rounded-xl shadow-sm"
                        title="Apply category to all"
                      >
                        Apply
                      </button>
                    </div>
                  </div>

                  {/* Unit Fast Apply */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-500 uppercase block">Unit</label>
                    <div className="flex gap-1">
                      <select
                        value={bulkUnit}
                        onChange={(e) => setBulkUnit(e.target.value)}
                        className="flex-1 bg-white border border-slate-200 rounded-xl px-2 py-1 text-xs font-bold text-slate-800 outline-none"
                      >
                        {UNIT_OPTIONS.map((u) => (
                          <option key={u.value} value={u.value}>{u.value}</option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => handleApplyToAllOrSelected('unit', bulkUnit)}
                        className="bg-primary-600 hover:bg-primary-700 text-white font-bold text-[10px] px-2 py-1 rounded-xl shadow-sm"
                        title="Apply unit to all"
                      >
                        Apply
                      </button>
                    </div>
                  </div>

                  {/* Stock Fast Apply */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-500 uppercase block">Stock</label>
                    <div className="flex gap-1">
                      <input
                        type="number"
                        min="0"
                        value={bulkStock}
                        onChange={(e) => setBulkStock(e.target.value)}
                        className="w-16 bg-white border border-slate-200 rounded-xl px-2 py-1 text-xs font-bold text-slate-800 outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => handleApplyToAllOrSelected('stock', bulkStock)}
                        className="bg-primary-600 hover:bg-primary-700 text-white font-bold text-[10px] px-2 py-1 rounded-xl shadow-sm"
                        title="Apply stock to all"
                      >
                        Apply
                      </button>
                    </div>
                  </div>

                  {/* Brand Fast Apply */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-500 uppercase block">Brand</label>
                    <div className="flex gap-1">
                      <input
                        type="text"
                        placeholder="e.g. Fresh"
                        value={bulkBrand}
                        onChange={(e) => setBulkBrand(e.target.value)}
                        className="flex-1 bg-white border border-slate-200 rounded-xl px-2 py-1 text-xs font-bold text-slate-800 outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => handleApplyToAllOrSelected('brand', bulkBrand)}
                        className="bg-primary-600 hover:bg-primary-700 text-white font-bold text-[10px] px-2 py-1 rounded-xl shadow-sm"
                        title="Apply brand to all"
                      >
                        Apply
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Product Cards Responsive Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {items.map((item, idx) => {
                  const { isValid, errors, isDuplicate } = validateItem(item);
                  const isSelected = selectedItemIds.has(item.id);

                  return (
                    <div
                      key={item.id}
                      className={`bg-white rounded-2xl border p-4 shadow-sm transition-all relative flex flex-col justify-between space-y-3 ${
                        !isValid
                          ? 'border-amber-200 bg-amber-50/10'
                          : isSelected
                          ? 'border-primary-400 ring-1 ring-primary-400/30'
                          : 'border-slate-100 hover:border-slate-200'
                      }`}
                    >
                      {/* Top Header */}
                      <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-2.5">
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleSelectItem(item.id)}
                            className="rounded text-primary-600 focus:ring-primary-500 h-4 w-4 border-slate-300 cursor-pointer"
                          />
                          <span className="text-[11px] font-black text-slate-700">
                            #{idx + 1}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono font-bold truncate max-w-[120px]">
                            {item.filename}
                          </span>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleDuplicateDetailsToAll(item)}
                            className="p-1 text-primary-600 hover:bg-primary-50 rounded-lg text-[10px] font-bold flex items-center gap-0.5 border border-primary-100"
                            title="Copy category, unit, stock, brand from this card to all other cards"
                          >
                            <Copy size={11} />
                            <span>Copy Details</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(item.id)}
                            className="p-1 text-rose-500 hover:bg-rose-50 rounded-lg"
                            title="Remove product"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>

                      {/* Image Preview + Core Inputs */}
                      <div className="flex gap-3">
                        {/* Image Thumbnail */}
                        <div className="w-24 h-24 sm:w-28 sm:h-28 bg-slate-50 rounded-xl overflow-hidden border border-slate-200 shrink-0 flex items-center justify-center shadow-inner relative group">
                          <img
                            src={item.previewUrl}
                            alt={item.name}
                            className="w-full h-full object-contain p-1"
                          />
                          {item.uploadStatus === 'uploaded' && (
                            <div className="absolute bottom-1 right-1 bg-emerald-500 text-white rounded-full p-0.5">
                              <Check size={10} />
                            </div>
                          )}
                        </div>

                        {/* Core Fields */}
                        <div className="flex-1 space-y-2 min-w-0">
                          <div>
                            <label className="text-[9px] font-black text-slate-400 uppercase block mb-0.5">
                              Product Name <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="text"
                              value={item.name}
                              onChange={(e) => handleItemFieldChange(item.id, 'name', e.target.value)}
                              placeholder="e.g. Royal Gala Apple"
                              className="input-field text-xs py-1.5 font-bold"
                              required
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="text-[9px] font-black text-slate-400 uppercase block mb-0.5">
                                Category <span className="text-red-500">*</span>
                              </label>
                              <select
                                value={item.category}
                                onChange={(e) => handleItemFieldChange(item.id, 'category', e.target.value)}
                                className="input-field text-xs py-1.5 font-bold"
                              >
                                {STUDENT_VISIBLE_CATEGORIES.map((cat) => (
                                  <option key={cat} value={cat}>{cat}</option>
                                ))}
                              </select>
                            </div>

                            <div>
                              <label className="text-[9px] font-black text-slate-400 uppercase block mb-0.5">
                                Unit
                              </label>
                              <select
                                value={item.unit}
                                onChange={(e) => handleItemFieldChange(item.id, 'unit', e.target.value)}
                                className="input-field text-xs py-1.5 font-bold"
                              >
                                {UNIT_OPTIONS.map((u) => (
                                  <option key={u.value} value={u.value}>{u.label}</option>
                                ))}
                              </select>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Pricing & Stock Details */}
                      <div className="grid grid-cols-3 gap-2 pt-1">
                        <div>
                          <label className="text-[9px] font-black text-slate-400 uppercase block mb-0.5">
                            Price (₹) <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="number"
                            min="0"
                            placeholder="e.g. 120"
                            value={item.price}
                            onChange={(e) => handleItemFieldChange(item.id, 'price', e.target.value)}
                            className="input-field text-xs py-1.5 font-bold font-mono"
                            required
                          />
                        </div>

                        <div>
                          <label className="text-[9px] font-black text-slate-400 uppercase block mb-0.5">
                            MRP (₹)
                          </label>
                          <input
                            type="number"
                            min="0"
                            placeholder="e.g. 140"
                            value={item.mrp}
                            onChange={(e) => handleItemFieldChange(item.id, 'mrp', e.target.value)}
                            className="input-field text-xs py-1.5 font-bold font-mono"
                          />
                        </div>

                        <div>
                          <label className="text-[9px] font-black text-slate-400 uppercase block mb-0.5">
                            Stock <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="number"
                            min="0"
                            placeholder="e.g. 50"
                            value={item.stock}
                            onChange={(e) => handleItemFieldChange(item.id, 'stock', e.target.value)}
                            className="input-field text-xs py-1.5 font-bold font-mono"
                            required
                          />
                        </div>
                      </div>

                      {/* Brand / Origin */}
                      <div>
                        <label className="text-[9px] font-black text-slate-400 uppercase block mb-0.5">
                          Brand / Origin
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. Shimla Orchard"
                          value={item.brand}
                          onChange={(e) => handleItemFieldChange(item.id, 'brand', e.target.value)}
                          className="input-field text-xs py-1.5 font-semibold"
                        />
                      </div>

                      {/* Error & Warning Badges */}
                      {errors.length > 0 && (
                        <div className="bg-amber-50 border border-amber-100 rounded-xl p-2 text-[10px] text-amber-800 font-bold space-y-0.5">
                          {errors.map((err, i) => (
                            <div key={i} className="flex items-center gap-1">
                              <span>⚠️</span>
                              <span>{err}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {isDuplicate && (
                        <div className="bg-blue-50 border border-blue-100 rounded-xl p-2 text-[10px] text-blue-800 font-bold flex items-center justify-between">
                          <span>ℹ️ Already in catalog</span>
                          <span className="text-[9px] text-blue-600 uppercase">Warning</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* STEP 3: REVIEW SUMMARY                                   */}
          {/* ======================================================== */}
          {step === 'review' && (
            <div className="space-y-6">
              <div className="border-b border-slate-100 pb-3">
                <h3 className="text-base font-black text-slate-900 tracking-tight">
                  BULK PRODUCT REVIEW
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  Review catalog statistics, category distribution, and duplicate protection before creating products.
                </p>
              </div>

              {/* High-level Metric Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-slate-50 border border-slate-100 p-4 rounded-2xl">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Total Products</span>
                  <span className="text-2xl font-black text-slate-800 mt-1 block">{validationSummary.total}</span>
                </div>
                <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-2xl">
                  <span className="text-[10px] font-black text-emerald-600 uppercase tracking-wider block">Ready to Save</span>
                  <span className="text-2xl font-black text-emerald-700 mt-1 block">{validationSummary.readyCount}</span>
                </div>
                <div className={`p-4 rounded-2xl border ${validationSummary.errorCount > 0 ? 'bg-rose-50 border-rose-100' : 'bg-slate-50 border-slate-100'}`}>
                  <span className={`text-[10px] font-black uppercase tracking-wider block ${validationSummary.errorCount > 0 ? 'text-rose-600' : 'text-slate-400'}`}>
                    Need Attention
                  </span>
                  <span className={`text-2xl font-black mt-1 block ${validationSummary.errorCount > 0 ? 'text-rose-700' : 'text-slate-800'}`}>
                    {validationSummary.errorCount}
                  </span>
                </div>
                <div className="bg-primary-50 border border-primary-100 p-4 rounded-2xl">
                  <span className="text-[10px] font-black text-primary-700 uppercase tracking-wider block">Total Stock Valuation</span>
                  <span className="text-2xl font-black text-primary-900 mt-1 block">₹{validationSummary.totalStockVal.toLocaleString('en-IN')}</span>
                </div>
              </div>

              {/* Category Breakdown Table */}
              <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm space-y-3">
                <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider">
                  Category Distribution
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                  {STUDENT_VISIBLE_CATEGORIES.map((cat) => (
                    <div key={cat} className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-center">
                      <span className="text-[10px] text-slate-400 font-black uppercase block truncate">{cat}</span>
                      <span className="text-lg font-black text-slate-800 mt-0.5 block">{validationSummary.categoryCounts[cat] || 0}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Duplicate Handling Guard */}
              {validationSummary.duplicateCount > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div className="space-y-1.5 flex-1">
                    <h4 className="text-xs font-black text-amber-900">
                      {validationSummary.duplicateCount} Duplicate Products Detected
                    </h4>
                    <p className="text-xs text-amber-700 font-medium leading-relaxed">
                      Some product names already exist in your catalog. By default, duplicate products will be safely skipped to protect catalog integrity.
                    </p>
                    <label className="flex items-center gap-2 pt-1 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={allowDuplicates}
                        onChange={(e) => setAllowDuplicates(e.target.checked)}
                        className="rounded text-amber-600 focus:ring-amber-500 h-4 w-4 border-amber-300"
                      />
                      <span className="text-xs font-bold text-amber-900">
                        Allow creating duplicate entries anyway
                      </span>
                    </label>
                  </div>
                </div>
              )}

              {/* Error list if any item needs attention */}
              {validationSummary.errorCount > 0 && (
                <div className="bg-rose-50 border border-rose-100 rounded-2xl p-4 space-y-2">
                  <div className="flex items-center gap-2 text-rose-700 font-extrabold text-xs">
                    <AlertCircle size={15} />
                    <span>Please fix errors in the following {validationSummary.errorCount} products before saving:</span>
                  </div>
                  <div className="max-h-40 overflow-y-auto space-y-1 pr-1 text-xs">
                    {items.map((it, idx) => {
                      const { isValid, errors } = validateItem(it);
                      if (isValid) return null;
                      return (
                        <div key={it.id} className="bg-white p-2 rounded-xl border border-rose-200 flex justify-between items-center text-xs">
                          <span className="font-bold text-slate-800">#{idx + 1} {it.name || it.filename}</span>
                          <span className="text-rose-600 font-bold">{errors.join(', ')}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ======================================================== */}
          {/* STEP 4: SAVING PROGRESS SCREEN                           */}
          {/* ======================================================== */}
          {step === 'saving' && (
            <div className="py-12 px-4 text-center space-y-6 max-w-md mx-auto">
              <div className="w-16 h-16 rounded-full bg-primary-50 text-primary-600 flex items-center justify-center mx-auto animate-pulse">
                <RefreshCw size={28} className="animate-spin" />
              </div>

              <div className="space-y-2">
                <h3 className="text-base font-black text-slate-900">{saveProgress.phase}</h3>
                <p className="text-xs text-slate-500 font-semibold">
                  Uploading images via Cloudinary pipeline with automatic WebP compression.
                </p>
              </div>

              <div className="space-y-2">
                <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden border border-slate-200 shadow-inner">
                  <div
                    className="bg-primary-600 h-full rounded-full transition-all duration-300"
                    style={{
                      width: `${saveProgress.total > 0 ? (saveProgress.current / saveProgress.total) * 100 : 10}%`,
                    }}
                  />
                </div>
                <div className="flex justify-between text-[11px] font-mono font-bold text-slate-500">
                  <span>{saveProgress.current} / {saveProgress.total}</span>
                  <span>{saveProgress.total > 0 ? Math.round((saveProgress.current / saveProgress.total) * 100) : 0}%</span>
                </div>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* STEP 5: SUCCESS / RESULT SCREEN                          */}
          {/* ======================================================== */}
          {step === 'result' && saveResults && (
            <div className="space-y-6">
              <div className="text-center space-y-2 py-4 border-b border-slate-100">
                <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto shadow-sm">
                  <CheckCircle2 size={26} />
                </div>
                <h3 className="text-lg font-black text-slate-900">Bulk Product Creation Completed</h3>
                <p className="text-xs text-slate-500 font-medium">
                  {saveResults.summary?.successCount || 0} products successfully created in catalog.
                </p>
              </div>

              {/* Created Products Grid */}
              {saveResults.created && saveResults.created.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-xs font-black text-emerald-700 uppercase tracking-wide">
                    ✓ Successfully Created ({saveResults.created.length})
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3 max-h-56 overflow-y-auto pr-1">
                    {saveResults.created.map((prod) => (
                      <div key={prod._id} className="bg-white border border-emerald-100 rounded-2xl p-2.5 shadow-sm space-y-1.5 text-center">
                        <div className="w-full aspect-square bg-slate-50 rounded-xl overflow-hidden border border-slate-100 flex items-center justify-center">
                          <img src={prod.image} alt={prod.name} className="w-full h-full object-contain p-1" />
                        </div>
                        <span className="text-xs font-extrabold text-slate-800 block truncate">{prod.name}</span>
                        <div className="flex justify-between items-center text-[10px] font-bold text-slate-500">
                          <span>{prod.category}</span>
                          <span className="text-emerald-600 font-black">₹{prod.price}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Failed Products Details if any */}
              {saveResults.failed && saveResults.failed.length > 0 && (
                <div className="space-y-3 bg-rose-50 border border-rose-100 rounded-2xl p-4">
                  <h4 className="text-xs font-black text-rose-700 uppercase tracking-wide flex items-center gap-1.5">
                    <AlertCircle size={14} />
                    <span>Failed Products ({saveResults.failed.length})</span>
                  </h4>
                  <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                    {saveResults.failed.map((fail, idx) => (
                      <div key={idx} className="bg-white p-2.5 rounded-xl border border-rose-200 flex justify-between items-center text-xs">
                        <span className="font-bold text-slate-800">#{fail.index} {fail.name}</span>
                        <span className="text-rose-600 font-bold">❌ {fail.error}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

        </div>

        {/* Modal Footer Controls */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex flex-wrap items-center justify-between gap-3">
          <div>
            {step === 'configure' && (
              <button
                type="button"
                onClick={() => setStep('select')}
                className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-100 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
              >
                <ArrowLeft size={14} />
                <span>Back to Images</span>
              </button>
            )}
            {step === 'review' && (
              <button
                type="button"
                onClick={() => setStep('configure')}
                className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-100 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
              >
                <ArrowLeft size={14} />
                <span>Back to Edit Details</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {step !== 'saving' && step !== 'result' && (
              <button
                type="button"
                onClick={handleAttemptClose}
                className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-100 rounded-xl text-xs font-bold transition-colors"
              >
                Cancel
              </button>
            )}

            {step === 'select' && (
              <button
                type="button"
                disabled={items.length === 0}
                onClick={() => setStep('configure')}
                className="btn-primary text-xs py-2 px-5 rounded-xl flex items-center gap-1.5 shadow-md disabled:opacity-40"
              >
                <span>Continue to Configure</span>
                <ArrowRight size={14} />
              </button>
            )}

            {step === 'configure' && (
              <button
                type="button"
                disabled={items.length === 0}
                onClick={() => setStep('review')}
                className="btn-primary text-xs py-2 px-5 rounded-xl flex items-center gap-1.5 shadow-md disabled:opacity-40"
              >
                <span>Review Products ({items.length})</span>
                <ArrowRight size={14} />
              </button>
            )}

            {step === 'review' && (
              <button
                type="button"
                disabled={validationSummary.errorCount > 0 || items.length === 0}
                onClick={handleExecuteSaveAll}
                className="btn-primary text-xs py-2 px-6 rounded-xl flex items-center gap-1.5 shadow-lg hover:shadow-xl disabled:opacity-40"
              >
                <Check size={14} />
                <span>Save All {items.length} Products</span>
              </button>
            )}

            {step === 'result' && (
              <button
                type="button"
                onClick={resetAndClose}
                className="btn-primary text-xs py-2 px-6 rounded-xl shadow-md"
              >
                Done & View Catalog
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default BulkProductModal;
