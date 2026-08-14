"use client";

import React, { useState, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/services/apiClient";
import {
  Utensils,
  Plus,
  Trash2,
  Edit2,
  Search,
  Sparkles,
  Shield,
  Upload,
  Download,
  FileSpreadsheet,
  Layers,
  Lock,
  X
} from "lucide-react";
import { toast } from "sonner";

export default function MenuBuilderScreen() {
  const { store, setStore, getActiveTenant, verifyManagerPin, isManagerUnlocked } = useAuth();
  const tenant = getActiveTenant();
  const currencySymbol = tenant?.currencySymbol || "₹";

  const categories = (store.categories || []).filter((c) => !c.tenantId || c.tenantId === tenant?.id);
  const menuItems = (store.menuItems || []).filter((m) => !m.tenantId || m.tenantId === tenant?.id);

  const [selectedCatId, setSelectedCatId] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Modals state
  const [showItemModal, setShowItemModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  
  // View Mode: 'dishes' (default) or 'categories' (in-page page rendering)
  const [activeTab, setActiveTab] = useState("dishes");
  
  // Category Management & Multi-Add State
  const [showAddCatModal, setShowAddCatModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  
  // Dynamic Multi-Category Creation list (Icon optional)
  const [catForms, setCatForms] = useState([{ name: "", icon: "" }]);

  // Manager PIN Prompt Modal State
  const [showPinModal, setShowPinModal] = useState(false);
  const [managerPinInput, setManagerPinInput] = useState("");
  const [pinActionTarget, setPinActionTarget] = useState(null); // { type: 'SAVE_ITEM'|'DELETE_ITEM'|'SAVE_CATEGORIES'|'UPDATE_CATEGORY'|'DELETE_CATEGORY', payload: any }

  // Bulk Import state
  const [showImportModal, setShowImportModal] = useState(false);
  const [importedItems, setImportedItems] = useState([]);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef(null);

  // Item Form state
  const [itemName, setItemName] = useState("");
  const [itemCatId, setItemCatId] = useState(categories[0]?.id || "");
  const [itemPrice, setItemPrice] = useState("");
  const [itemDesc, setItemDesc] = useState("");
  const [dietaryType, setDietaryType] = useState("none"); // "none" | "veg" | "non-veg"
  const [itemIsChefSpecial, setItemIsChefSpecial] = useState(false);
  const [itemImage, setItemImage] = useState("");

  // Helper to open PIN modal before execution (or auto-bypass if unlocked)
  const requireManagerPin = (actionType, payload) => {
    if (isManagerUnlocked) {
      switch (actionType) {
        case "SAVE_ITEM": executeSaveItem(payload); break;
        case "DELETE_ITEM": executeDeleteItem(payload); break;
        case "SAVE_CATEGORIES": executeSaveCategories(payload); break;
        case "UPDATE_CATEGORY": executeUpdateCategory(payload); break;
        case "DELETE_CATEGORY": executeDeleteCategory(payload); break;
      }
      return;
    }
    setManagerPinInput("");
    setPinActionTarget({ type: actionType, payload });
    setShowPinModal(true);
  };

  // Dish Handlers
  const openCreateModal = () => {
    setEditingItem(null);
    setItemName("");
    setItemCatId(categories[0]?.id || "");
    setItemPrice("");
    setItemDesc("");
    setDietaryType("none");
    setItemIsChefSpecial(false);
    setItemImage("");
    setShowItemModal(true);
  };

  const openEditModal = (item) => {
    setEditingItem(item);
    setItemName(item.name);
    setItemCatId(item.categoryId);
    setItemPrice(String(item.price));
    setItemDesc(item.description || "");
    if (item.dietaryType) {
      setDietaryType(item.dietaryType);
    } else if (item.isVeg === true) {
      setDietaryType("veg");
    } else if (item.isVeg === false && item.dietaryType === "non-veg") {
      setDietaryType("non-veg");
    } else {
      setDietaryType("none");
    }
    setItemIsChefSpecial(item.isChefSpecial || false);
    setItemImage(item.image || "");
    setShowItemModal(true);
  };

  const initiateSaveItem = (e) => {
    e.preventDefault();
    if (!itemName || !itemPrice) {
      toast.error("Please fill dish name and price.");
      return;
    }
    const finalCatId = itemCatId || categories[0]?.id;
    if (!finalCatId) {
      toast.error("Please create a menu category first.");
      return;
    }

    const parsedNum = parseFloat(itemPrice);
    const roundedPrice = isNaN(parsedNum) ? 0.00 : Math.round(parsedNum * 100) / 100;

    const payload = {
      tenantId: tenant?.id || "tenant-spice-bistro",
      categoryId: finalCatId,
      name: itemName,
      price: roundedPrice,
      description: itemDesc,
      dietaryType: dietaryType,
      isVeg: dietaryType === "veg" ? true : dietaryType === "non-veg" ? false : null,
      isChefSpecial: itemIsChefSpecial,
      image: itemImage ? itemImage.trim() : "",
      isAvailable: true
    };

    requireManagerPin("SAVE_ITEM", payload);
  };

  const executeSaveItem = async (payload) => {
    if (editingItem) {
      try {
        const res = await api.updateMenuItem(editingItem.id, payload);
        if (res && res.success && res.data) {
          setStore((prev) => ({
            ...prev,
            menuItems: prev.menuItems.map((m) => (m.id === editingItem.id ? res.data : m))
          }));
          toast.success(`Updated "${itemName}" in Database`);
          setShowItemModal(false);
        } else {
          toast.error(res?.message || "Failed to update menu item in Database");
        }
      } catch (err) {
        toast.error(`Database error: ${err.message}`);
      }
    } else {
      try {
        const res = await api.createMenuItem(payload);
        if (res && res.success && res.data) {
          setStore((prev) => ({
            ...prev,
            menuItems: [res.data, ...prev.menuItems]
          }));
          toast.success(`Added "${itemName}" to Database Menu`);
          setShowItemModal(false);
        } else {
          toast.error(res?.message || "Failed to create menu item in Database");
        }
      } catch (err) {
        toast.error(`Database error: ${err.message}`);
      }
    }
  };

  const initiateDeleteItem = (id, name) => {
    requireManagerPin("DELETE_ITEM", { id, name });
  };

  const executeDeleteItem = async ({ id, name }) => {
    try {
      const res = await api.deleteMenuItem(id);
      if (res && res.success) {
        setStore((prev) => ({
          ...prev,
          menuItems: prev.menuItems.filter((m) => m.id !== id)
        }));
        toast.info(`Deleted "${name}" from Database`);
      } else {
        toast.error(res?.message || "Failed to delete menu item");
      }
    } catch (err) {
      toast.error(`Database delete error: ${err.message}`);
    }
  };

  // Multi Category Form Handlers
  const openAddCategoryModal = () => {
    setCatForms([{ name: "", icon: "" }]);
    setShowAddCatModal(true);
  };

  const addCatFormField = () => {
    setCatForms((prev) => [...prev, { name: "", icon: "" }]);
  };

  const removeCatFormField = (index) => {
    setCatForms((prev) => prev.filter((_, idx) => idx !== index));
  };

  const updateCatFormField = (index, field, value) => {
    setCatForms((prev) =>
      prev.map((c, idx) => (idx === index ? { ...c, [field]: value } : c))
    );
  };

  const initiateSaveCategories = (e) => {
    e.preventDefault();
    const validCategories = catForms.filter((c) => c.name.trim() !== "");
    if (validCategories.length === 0) {
      toast.error("Please enter at least one valid category name.");
      return;
    }

    requireManagerPin("SAVE_CATEGORIES", validCategories);
  };

  const executeSaveCategories = async (categoryList) => {
    try {
      const payload = categoryList.map((c, idx) => ({
        name: c.name.trim(),
        icon: c.icon ? c.icon.trim() : "",
        sortOrder: categories.length + idx + 1
      }));

      const res = await api.createCategory(payload.length === 1 ? payload[0] : payload);
      if (res && res.success && res.data) {
        const newCats = Array.isArray(res.data) ? res.data : [res.data];
        setStore((prev) => ({
          ...prev,
          categories: [...prev.categories, ...newCats]
        }));
        toast.success(`Successfully saved ${newCats.length} category(ies) to Database`);
        setShowAddCatModal(false);
      } else {
        toast.error(res?.message || "Failed to create category");
      }
    } catch (err) {
      toast.error(`Database category error: ${err.message}`);
    }
  };

  const initiateEditCategory = (cat) => {
    setEditingCategory({ ...cat });
  };

  const initiateUpdateCategory = (e) => {
    e.preventDefault();
    if (!editingCategory || !editingCategory.name.trim()) {
      toast.error("Category name cannot be empty");
      return;
    }
    requireManagerPin("UPDATE_CATEGORY", editingCategory);
  };

  const executeUpdateCategory = async (catPayload) => {
    try {
      const res = await api.updateCategory(catPayload.id, {
        name: catPayload.name,
        icon: catPayload.icon
      });
      if (res && res.success) {
        const updated = res.data || catPayload;
        setStore((prev) => ({
          ...prev,
          categories: prev.categories.map((c) => (c.id === catPayload.id ? updated : c))
        }));
        toast.success(`Updated category "${catPayload.name}"`);
        setEditingCategory(null);
      } else {
        toast.error(res?.message || "Failed to update category");
      }
    } catch (err) {
      toast.error(`Database update category error: ${err.message}`);
    }
  };

  const initiateDeleteCategory = (cat) => {
    requireManagerPin("DELETE_CATEGORY", cat);
  };

  const executeDeleteCategory = async (cat) => {
    try {
      const res = await api.deleteCategory(cat.id);
      if (res && res.success) {
        setStore((prev) => ({
          ...prev,
          categories: prev.categories.filter((c) => c.id !== cat.id)
        }));
        if (selectedCatId === cat.id) setSelectedCatId("all");
        toast.info(`Deleted category "${cat.name}"`);
      } else {
        toast.error(res?.message || "Failed to delete category");
      }
    } catch (err) {
      toast.error(`Database delete category error: ${err.message}`);
    }
  };

  // Execute PIN Verification Action
  const handlePinSubmit = async (e) => {
    e.preventDefault();
    if (!(await verifyManagerPin(managerPinInput))) {
      toast.error("Invalid Manager PIN! Action unauthorized.", {
        description: "Please enter a valid Manager or Owner PIN."
      });
      return;
    }

    setShowPinModal(false);
    if (!pinActionTarget) return;

    switch (pinActionTarget.type) {
      case "SAVE_ITEM":
        executeSaveItem(pinActionTarget.payload);
        break;
      case "DELETE_ITEM":
        executeDeleteItem(pinActionTarget.payload);
        break;
      case "SAVE_CATEGORIES":
        executeSaveCategories(pinActionTarget.payload);
        break;
      case "UPDATE_CATEGORY":
        executeUpdateCategory(pinActionTarget.payload);
        break;
      case "DELETE_CATEGORY":
        executeDeleteCategory(pinActionTarget.payload);
        break;
      default:
        break;
    }
  };

  // Bulk Import Handlers - Download Excel/CSV Import Template (Headers only)
  const downloadImportTemplate = () => {
    const csvContent = "Name,Category,Price,Description,Dietary(veg/non-veg),ChefSpecial(yes/no),ImageURL\n";

    const encodedUri = encodeURI("data:text/csv;charset=utf-8," + csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "SmartServe_Menu_Import_Template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Downloaded Excel/CSV Menu Import Template!");
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target.result;
      const lines = text.split(/\r\n|\n/).filter((l) => l.trim() !== "");
      if (lines.length < 2) {
        toast.error("CSV file is empty or missing data rows.");
        return;
      }

      const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
      const nameIdx = headers.findIndex((h) => h.includes("name"));
      const catIdx = headers.findIndex((h) => h.includes("cat"));
      const priceIdx = headers.findIndex((h) => h.includes("price"));
      const descIdx = headers.findIndex((h) => h.includes("desc"));
      const dietIdx = headers.findIndex((h) => h.includes("diet") || h.includes("veg"));
      const specialIdx = headers.findIndex((h) => h.includes("chef") || h.includes("special"));
      const imgIdx = headers.findIndex((h) => h.includes("img") || h.includes("image") || h.includes("url"));

      if (nameIdx === -1 || priceIdx === -1) {
        toast.error("CSV missing mandatory columns ('Name', 'Price').");
        return;
      }

      const parsed = [];
      for (let i = 1; i < lines.length; i++) {
        const row = lines[i].split(/,(?=(?:[^\"]*\"[^\"]*\")*[^\"]*$)/).map((val) => val.replace(/^"|"$/g, "").trim());
        if (!row[nameIdx]) continue;

        const name = row[nameIdx] || "";
        const category = catIdx !== -1 && row[catIdx] ? row[catIdx] : "General";
        const price = parseFloat(row[priceIdx]) || 0;
        const description = descIdx !== -1 ? row[descIdx] || "" : "";
        const dietVal = dietIdx !== -1 ? (row[dietIdx] || "").toLowerCase() : "";
        const dietaryType = dietVal.includes("veg") && !dietVal.includes("non") ? "veg" : dietVal.includes("non") ? "non-veg" : "none";
        const isVeg = dietaryType === "veg" ? true : dietaryType === "non-veg" ? false : null;
        const specialVal = specialIdx !== -1 ? (row[specialIdx] || "").toLowerCase() : "";
        const isChefSpecial = specialVal.includes("yes") || specialVal.includes("true") || specialVal === "1";
        const image = imgIdx !== -1 && row[imgIdx] ? row[imgIdx] : null;

        parsed.push({
          name,
          category,
          price,
          description,
          dietaryType,
          isVeg,
          isChefSpecial,
          image
        });
      }

      if (parsed.length === 0) {
        toast.error("No valid menu dishes found in CSV file.");
        return;
      }

      setImportedItems(parsed);
      setShowImportModal(true);
    };

    reader.readAsText(file);
    e.target.value = "";
  };

  const handleConfirmImport = async () => {
    if (importedItems.length === 0) return;
    setImporting(true);

    try {
      let currentCategories = [...categories];
      const categoryMap = new Map();
      currentCategories.forEach((c) => categoryMap.set(c.name.trim().toLowerCase(), c.id));

      const uniqueCategories = [...new Set(importedItems.map((item) => item.category.trim()))];
      for (const catName of uniqueCategories) {
        const key = catName.toLowerCase();
        if (!categoryMap.has(key)) {
          const res = await api.createCategory({
            name: catName,
            icon: "🍽️",
            sortOrder: currentCategories.length + 1
          });
          if (res && res.success && res.data) {
            const newCat = Array.isArray(res.data) ? res.data[0] : res.data;
            categoryMap.set(key, newCat.id);
            currentCategories.push(newCat);
          }
        }
      }

      setStore((prev) => ({ ...prev, categories: currentCategories }));

      const newCreatedItems = [];
      for (const item of importedItems) {
        const catId = categoryMap.get(item.category.trim().toLowerCase()) || currentCategories[0]?.id;
        const payload = {
          tenantId: tenant?.id || "tenant-spice-bistro",
          categoryId: catId,
          name: item.name,
          price: item.price,
          description: item.description,
          dietaryType: item.dietaryType,
          isVeg: item.isVeg,
          isChefSpecial: item.isChefSpecial,
          image: item.image,
          isAvailable: true
        };

        const res = await api.createMenuItem(payload);
        if (res && res.success && res.data) {
          newCreatedItems.push(res.data);
        }
      }

      setStore((prev) => ({
        ...prev,
        menuItems: [...newCreatedItems, ...prev.menuItems]
      }));

      toast.success(`Successfully imported ${newCreatedItems.length} bulk dish(es) into Menu!`);
      setShowImportModal(false);
      setImportedItems([]);
    } catch (err) {
      toast.error(`Bulk import error: ${err.message}`);
    } finally {
      setImporting(false);
    }
  };

  const filteredItems = menuItems.filter((i) => {
    const matchesCat = selectedCatId === "all" || i.categoryId === selectedCatId;
    const matchesSearch = !searchQuery || i.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  return (
    <div className="h-full flex flex-col gap-4 overflow-hidden font-sans">
      
      {/* Hidden File Input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
        className="hidden"
      />

      {/* Header Bar */}
      <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#FF5B32] to-amber-500 flex items-center justify-center text-white shadow-md shadow-[#FF5B32]/30">
            <Utensils className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-black text-base text-stone-900">Interactive Menu Builder</h2>
            <p className="text-xs text-stone-500">Create, edit, price, and organize categories & dishes for {tenant?.name}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={downloadImportTemplate}
            className="px-3.5 py-2 rounded-xl border border-stone-200 hover:border-stone-300 font-bold text-xs text-stone-700 bg-stone-50 shadow-sm flex items-center gap-1.5 cursor-pointer transition-colors"
            title="Download clean Excel/CSV template with headers for bulk dish import"
          >
            <Download className="w-4 h-4 text-stone-600" />
            Download Template
          </button>

          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-3.5 py-2 rounded-xl border border-stone-300 hover:border-stone-400 font-bold text-xs text-stone-800 bg-white shadow-sm flex items-center gap-1.5 cursor-pointer transition-colors"
          >
            <Upload className="w-4 h-4 text-emerald-600" />
            Import Excel/CSV
          </button>

          {/* Manage Categories Button */}
          <button
            onClick={() => setActiveTab(activeTab === "categories" ? "dishes" : "categories")}
            className={`px-3.5 py-2 rounded-xl border border-stone-300 font-bold text-xs shadow-sm flex items-center gap-1.5 cursor-pointer transition-colors ${
              activeTab === "categories" ? "bg-stone-900 text-white border-stone-900" : "bg-white text-stone-800 hover:border-stone-400"
            }`}
          >
            <Layers className="w-4 h-4 text-[#FF5B32]" />
            {activeTab === "categories" ? "View Menu Dishes" : "Categories & Details"}
          </button>

          <button
            onClick={openCreateModal}
            className="px-3.5 py-2 rounded-xl bg-[#FF5B32] hover:bg-[#e04d26] text-white font-black text-xs shadow-md shadow-[#FF5B32]/20 flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            Add Menu Dish
          </button>
        </div>
      </div>

      {/* Sub-Header Bar (Tab switcher & Search Bar) */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-stone-200 shadow-sm">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab("dishes")}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === "dishes" ? "bg-stone-900 text-white shadow-md" : "bg-stone-100 text-stone-600 hover:bg-stone-200"
            }`}
          >
            <Utensils className="w-3.5 h-3.5" />
            Menu Dishes ({menuItems.length})
          </button>

          <button
            onClick={() => setActiveTab("categories")}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === "categories" ? "bg-[#FF5B32] text-white shadow-md" : "bg-stone-100 text-stone-600 hover:bg-stone-200"
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            Categories & Details ({categories.length})
          </button>
        </div>

        {activeTab === "dishes" && (
          <div className="relative w-full sm:w-96 md:w-[420px]">
            <Search className="w-4 h-4 absolute left-3.5 top-3 text-stone-400" />
            <input
              type="text"
              placeholder="Search dish by name ..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-xl bg-stone-50 border border-stone-200 text-xs font-semibold focus:outline-none focus:border-[#FF5B32] shadow-inner"
            />
          </div>
        )}
      </div>

      {/* Category Pills Filter Bar (Interactive layout with visible horizontal scrollbar on screen overflow) */}
      {activeTab === "dishes" && (
        <div className="bg-stone-50/80 p-2.5 rounded-2xl border border-stone-200 flex items-center gap-1.5 overflow-x-auto scrollbar-thin scrollbar-thumb-stone-300 scrollbar-track-transparent hover:scrollbar-thumb-stone-400 py-3 transition-all">
          <button
            onClick={() => setSelectedCatId("all")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
              selectedCatId === "all" ? "bg-[#FF5B32] text-white shadow-sm" : "bg-white text-stone-700 border border-stone-200 hover:bg-stone-100"
            }`}
          >
            <span>All Dishes</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${selectedCatId === "all" ? "bg-white/20 text-white" : "bg-stone-200 text-stone-800"}`}>
              {menuItems.length}
            </span>
          </button>

          {categories.map((cat) => {
            const count = menuItems.filter((m) => m.categoryId === cat.id).length;
            const isSelected = selectedCatId === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCatId(cat.id)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold whitespace-nowrap flex items-center gap-1.5 transition-all cursor-pointer shrink-0 ${
                  isSelected ? "bg-[#FF5B32] text-white shadow-sm" : "bg-white text-stone-700 border border-stone-200 hover:bg-stone-100"
                }`}
              >
                {cat.icon && <span>{cat.icon}</span>}
                <span>{cat.name}</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${isSelected ? "bg-white/20 text-white" : "bg-stone-200 text-stone-800"}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Main In-Page View Content Area */}
      {activeTab === "dishes" ? (
        /* Menu Item Grid View - Professional & sleek across normal tab view and full screen view */
        <div className="flex-1 overflow-y-auto pr-1 pb-4 min-h-0">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 auto-rows-max">
          {filteredItems.map((item) => {
            const category = categories.find((c) => c.id === item.categoryId);
            return (
              <div
                key={item.id}
                className="bg-white rounded-3xl border border-stone-200/80 shadow-sm hover:shadow-xl hover:border-[#FF5B32]/40 transition-all duration-300 overflow-hidden group flex flex-col h-full"
              >
                {/* Card Image Banner */}
                <div className={`h-44 relative overflow-hidden flex items-center justify-center p-4 shrink-0 ${!item.image ? 'bg-[#FF5B32]' : 'bg-stone-100'}`}>
                  {item.image ? (
                    <img
                      src={item.image}
                      alt={item.name}
                      className="w-full h-full object-cover group-hover:scale-108 transition-transform duration-500 absolute inset-0"
                    />
                  ) : (
                    <div className="text-center px-2 z-0">
                      <span className="text-white font-black text-lg drop-shadow-md leading-snug line-clamp-3">
                        {item.name}
                      </span>
                    </div>
                  )}

                  {/* Subtle Gradient Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-stone-950/80 via-stone-950/20 to-stone-950/40 opacity-90 group-hover:opacity-95 transition-opacity" />

                  {/* Dietary Badges (Top Left) */}
                  <div className="absolute top-3 left-3 flex flex-wrap items-center gap-1.5 z-10">
                    {(item.dietaryType === "veg" || (item.isVeg === true && item.dietaryType !== "none")) && (
                      <span className="px-2.5 py-1 rounded-xl text-[10px] font-black uppercase text-white shadow-md bg-emerald-600/95 backdrop-blur-md">
                        🟢 VEG
                      </span>
                    )}
                    {(item.dietaryType === "non-veg" || (item.isVeg === false && item.dietaryType === "non-veg")) && (
                      <span className="px-2.5 py-1 rounded-xl text-[10px] font-black uppercase text-white shadow-md bg-red-600/95 backdrop-blur-md">
                        🔴 NON-VEG
                      </span>
                    )}
                    {item.isChefSpecial && (
                      <span className="px-2.5 py-1 rounded-xl text-[10px] font-black bg-amber-500/95 backdrop-blur-md text-white shadow-md flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-amber-100" /> Special
                      </span>
                    )}
                  </div>

                  {/* Interactive Quick Action Buttons (Top Right Banner Overlay) */}
                  <div className="absolute top-3 right-3 flex items-center gap-1.5 z-10 sm:opacity-90 group-hover:opacity-100 transition-all duration-200">
                    <button
                      type="button"
                      onClick={() => openEditModal(item)}
                      title="Edit Dish"
                      className="w-8 h-8 rounded-xl bg-white/95 hover:bg-white text-stone-800 flex items-center justify-center shadow-lg backdrop-blur-md transition-all hover:scale-110 cursor-pointer"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => initiateDeleteItem(item.id, item.name)}
                      title="Delete Dish"
                      className="w-8 h-8 rounded-xl bg-red-600/90 hover:bg-red-600 text-white flex items-center justify-center shadow-lg backdrop-blur-md transition-all hover:scale-110 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Price Tag (Bottom Right of Banner) */}
                  <div className="absolute bottom-3 right-3 bg-stone-950/85 backdrop-blur-md px-3 py-1 rounded-xl text-white font-black text-xs shadow-md border border-white/10 z-10 font-mono">
                    {currencySymbol}{Number(item.price || 0).toFixed(2)}
                  </div>
                </div>

                {/* Card Content Information Body */}
                <div className="p-4 space-y-1.5 flex-1 flex flex-col justify-start bg-white">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-black uppercase tracking-wider text-[#FF5B32] bg-orange-50 px-2 py-0.5 rounded-md border border-orange-100/80">
                        {category?.name || "General"}
                      </span>
                    </div>
                    <h3 className="font-extrabold text-stone-900 text-sm leading-snug line-clamp-1 group-hover:text-[#FF5B32] transition-colors">
                      {item.name}
                    </h3>
                  </div>
                  <p className="text-xs text-stone-500 font-medium line-clamp-2 leading-relaxed">
                    {item.description || "Freshly prepared dish with authentic ingredients."}
                  </p>
                </div>
              </div>
            );
          })}
          </div>
        </div>
      ) : (
        /* Categories & Pricing In-Page View (Replacing dish grid) */
        <div className="flex-1 bg-white p-5 rounded-2xl border border-stone-200 shadow-sm flex flex-col justify-between overflow-hidden space-y-4">
          <div className="flex items-center justify-between border-b border-stone-100 pb-3">
            <div>
              <h3 className="font-black text-lg text-stone-900 flex items-center gap-2">
                <Layers className="w-5 h-5 text-[#FF5B32]" />
                Categories & Pricing Details
              </h3>
              <p className="text-xs text-stone-500">Manage all food & beverage categories, icons, and item counts directly in-page.</p>
            </div>
            <button
              onClick={openAddCategoryModal}
              className="px-4 py-2 rounded-xl bg-[#FF5B32] hover:bg-[#e04d26] text-white font-extrabold text-xs shadow-md shadow-[#FF5B32]/20 flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[3]" /> Add New Category
            </button>
          </div>

          {/* Inline Edit Form if category edit triggered */}
          {editingCategory && (
            <form onSubmit={initiateUpdateCategory} className="bg-stone-50 p-4 rounded-2xl border border-stone-200 space-y-3">
              <h4 className="font-extrabold text-xs text-stone-800 uppercase tracking-wider">Edit Category Details</h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-stone-600 mb-1">Emoji / Icon (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. 🍛"
                    value={editingCategory.icon || ""}
                    onChange={(e) => setEditingCategory({ ...editingCategory, icon: e.target.value })}
                    className="w-full p-2 rounded-xl bg-white border border-stone-300 text-xs font-bold"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-bold text-stone-600 mb-1">Category Name</label>
                  <input
                    type="text"
                    required
                    value={editingCategory.name}
                    onChange={(e) => setEditingCategory({ ...editingCategory, name: e.target.value })}
                    className="w-full p-2 rounded-xl bg-white border border-stone-300 text-xs font-bold"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setEditingCategory(null)}
                  className="px-3 py-1.5 rounded-xl border border-stone-300 text-xs font-bold text-stone-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xl bg-[#FF5B32] text-white text-xs font-black shadow-sm"
                >
                  Update Category
                </button>
              </div>
            </form>
          )}

          {/* Full Page Categories Table */}
          <div className="flex-1 overflow-y-auto border border-stone-200 rounded-2xl">
            <table className="w-full text-left text-xs font-medium border-collapse">
              <thead>
                <tr className="bg-stone-100 text-[10px] font-black uppercase text-stone-500 border-b border-stone-200">
                  <th className="px-4 py-3">ICON</th>
                  <th className="px-4 py-3">CATEGORY NAME</th>
                  <th className="px-4 py-3">TOTAL DISHES</th>
                  <th className="px-4 py-3 text-right">ACTIONS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {categories.map((cat) => {
                  const dishCount = menuItems.filter((m) => m.categoryId === cat.id).length;
                  return (
                    <tr key={cat.id} className="hover:bg-stone-50 transition-colors">
                      <td className="px-4 py-3 text-xl font-bold">{cat.icon ? cat.icon : <span className="text-stone-300 text-xs italic">None</span>}</td>
                      <td className="px-4 py-3 font-extrabold text-stone-900">{cat.name}</td>
                      <td className="px-4 py-3 font-bold text-stone-600">
                        <span className="px-2.5 py-1 rounded-lg bg-stone-100 text-stone-800 text-xs font-black">
                          {dishCount} Dish(es)
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => initiateEditCategory(cat)}
                            className="px-3 py-1.5 rounded-lg border border-stone-200 text-stone-700 hover:border-stone-400 font-bold text-xs flex items-center gap-1 cursor-pointer bg-white"
                          >
                            <Edit2 className="w-3.5 h-3.5 text-stone-500" /> Edit
                          </button>
                          <button
                            onClick={() => initiateDeleteCategory(cat)}
                            className="px-3 py-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 font-bold text-xs flex items-center gap-1 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" /> Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Multi-Category Creation Modal (with Add More capability) */}
      {showAddCatModal && (
        <div className="fixed inset-0 z-50 bg-stone-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl border border-stone-200 space-y-4 max-h-[85vh] flex flex-col justify-between">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div>
                <h3 className="font-black text-lg text-stone-900">Add Menu Categories</h3>
                <p className="text-xs text-stone-500">Create one or multiple categories simultaneously</p>
              </div>
              <button onClick={() => setShowAddCatModal(false)} className="text-stone-400 hover:text-stone-600 font-bold text-sm">✕</button>
            </div>

            <form onSubmit={initiateSaveCategories} className="space-y-3 flex-1 overflow-y-auto pr-1">
              {catForms.map((form, idx) => (
                <div key={idx} className="p-3 bg-stone-50 rounded-2xl border border-stone-200 space-y-2 relative">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-extrabold uppercase text-[#FF5B32]">Category #{idx + 1}</span>
                    {catForms.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeCatFormField(idx)}
                        className="text-red-500 hover:text-red-700 text-xs font-bold flex items-center gap-0.5"
                      >
                        <X className="w-3.5 h-3.5" /> Remove
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-[10px] font-bold text-stone-600 mb-0.5">Emoji Icon (Optional)</label>
                      <input
                        type="text"
                        placeholder="e.g. 🍛"
                        value={form.icon}
                        onChange={(e) => updateCatFormField(idx, "icon", e.target.value)}
                        className="w-full p-2 rounded-xl bg-white border border-stone-300 text-xs font-bold text-stone-900 focus:outline-none focus:border-[#FF5B32]"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-[10px] font-bold text-stone-600 mb-0.5">Category Name *</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Starters, Beverages"
                        value={form.name}
                        onChange={(e) => updateCatFormField(idx, "name", e.target.value)}
                        className="w-full p-2 rounded-xl bg-white border border-stone-300 text-xs font-bold text-stone-900 focus:outline-none focus:border-[#FF5B32]"
                      />
                    </div>
                  </div>
                </div>
              ))}

              <button
                type="button"
                onClick={addCatFormField}
                className="w-full py-2.5 rounded-2xl border-2 border-dashed border-stone-300 hover:border-[#FF5B32] font-extrabold text-xs text-stone-600 hover:text-[#FF5B32] flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" /> Add More Category
              </button>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setShowAddCatModal(false)}
                  className="px-4 py-2 rounded-xl border border-stone-300 text-xs font-bold text-stone-600 hover:bg-stone-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#FF5B32] hover:bg-[#e04d26] text-white text-xs font-black shadow-md shadow-[#FF5B32]/30 flex items-center gap-1.5"
                >
                  <Shield className="w-3.5 h-3.5" /> Save Categories
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add / Edit Dish Modal */}
      {showItemModal && (
        <div className="fixed inset-0 z-50 bg-stone-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-stone-200 space-y-4">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <h3 className="font-black text-lg text-stone-900">
                {editingItem ? "Edit Dish" : "Create New Menu Dish"}
              </h3>
              <button onClick={() => setShowItemModal(false)} className="text-stone-400 hover:text-stone-600 font-bold text-sm">
                ✕
              </button>
            </div>

            <form onSubmit={initiateSaveItem} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">Dish Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Paneer Butter Masala"
                  value={itemName}
                  onChange={(e) => setItemName(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-stone-50 border border-stone-300 text-xs font-bold text-stone-900 focus:outline-none focus:border-[#FF5B32]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">Category *</label>
                  <select
                    value={itemCatId}
                    onChange={(e) => setItemCatId(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-stone-50 border border-stone-300 text-xs font-bold text-stone-900 focus:outline-none focus:border-[#FF5B32]"
                  >
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">Price ({currencySymbol}) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    placeholder="124.50"
                    value={itemPrice}
                    onChange={(e) => setItemPrice(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-stone-50 border border-stone-300 text-xs font-mono font-bold text-stone-900 focus:outline-none focus:border-[#FF5B32]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">Description</label>
                <textarea
                  rows={2}
                  placeholder="Brief ingredients description..."
                  value={itemDesc}
                  onChange={(e) => setItemDesc(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-stone-50 border border-stone-300 text-xs text-stone-900 focus:outline-none focus:border-[#FF5B32]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">Image URL</label>
                <input
                  type="url"
                  placeholder="https://images.unsplash.com/..."
                  value={itemImage}
                  onChange={(e) => setItemImage(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-stone-50 border border-stone-300 text-xs text-stone-900 focus:outline-none focus:border-[#FF5B32]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1.5">Dish Badges (Optional)</label>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setDietaryType((prev) => (prev === "veg" ? "none" : "veg"))}
                    className={`px-3 py-1.5 rounded-xl text-xs font-extrabold border transition-all cursor-pointer flex items-center gap-1.5 ${
                      dietaryType === "veg"
                        ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                        : "bg-stone-50 border-stone-200 text-stone-700 hover:bg-stone-100"
                    }`}
                  >
                    <span>🟢</span> Veg
                  </button>

                  <button
                    type="button"
                    onClick={() => setDietaryType((prev) => (prev === "non-veg" ? "none" : "non-veg"))}
                    className={`px-3 py-1.5 rounded-xl text-xs font-extrabold border transition-all cursor-pointer flex items-center gap-1.5 ${
                      dietaryType === "non-veg"
                        ? "bg-red-600 text-white border-red-600 shadow-sm"
                        : "bg-stone-50 border-stone-200 text-stone-700 hover:bg-stone-100"
                    }`}
                  >
                    <span>🔴</span> Non-Veg
                  </button>

                  <button
                    type="button"
                    onClick={() => setItemIsChefSpecial(!itemIsChefSpecial)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-extrabold border transition-all cursor-pointer flex items-center gap-1.5 ${
                      itemIsChefSpecial
                        ? "bg-amber-500 text-white border-amber-500 shadow-sm"
                        : "bg-stone-50 border-stone-200 text-stone-700 hover:bg-stone-100"
                    }`}
                  >
                    <Sparkles className="w-3.5 h-3.5" /> Chef Special
                  </button>
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setShowItemModal(false)}
                  className="px-4 py-2 rounded-xl border border-stone-300 text-xs font-bold text-stone-600 hover:bg-stone-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#FF5B32] hover:bg-[#e04d26] text-white text-xs font-black shadow-md shadow-[#FF5B32]/30 flex items-center gap-1.5"
                >
                  <Shield className="w-3.5 h-3.5" />
                  {editingItem ? "Save Changes" : "Create Dish"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Manager PIN Confirmation Modal */}
      {showPinModal && (
        <div className="fixed inset-0 z-50 bg-stone-950/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-stone-200 space-y-4">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2 text-amber-600">
                <Lock className="w-5 h-5" />
                <h3 className="font-black text-base text-stone-900">Manager Authorization</h3>
              </div>
              <button onClick={() => setShowPinModal(false)} className="text-stone-400 hover:text-stone-600 font-bold text-sm">✕</button>
            </div>

            <p className="text-xs text-stone-600">
              This action requires Manager authorization. Please enter your 4-digit Manager PIN.
            </p>

            <form onSubmit={handlePinSubmit} className="space-y-3">
              <div>
                <input
                  type="password"
                  required
                  maxLength={6}
                  placeholder="Enter Manager PIN"
                  value={managerPinInput}
                  onChange={(e) => setManagerPinInput(e.target.value)}
                  className="w-full p-3 rounded-2xl bg-stone-50 border border-stone-300 text-center font-mono font-black text-lg text-stone-900 tracking-widest focus:outline-none focus:border-[#FF5B32]"
                  autoFocus
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPinModal(false)}
                  className="px-4 py-2 rounded-xl border border-stone-300 text-xs font-bold text-stone-600 hover:bg-stone-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-black text-xs shadow-md shadow-amber-500/30 flex items-center gap-1.5 cursor-pointer"
                >
                  <Shield className="w-4 h-4" /> Verify PIN & Authorize
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk Import Preview Modal */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 bg-stone-950/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl p-6 max-w-2xl w-full shadow-2xl border border-stone-200 space-y-4 max-h-[85vh] flex flex-col justify-between">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2 text-emerald-600">
                <FileSpreadsheet className="w-5 h-5" />
                <h3 className="font-black text-base text-stone-900">Bulk Import Preview ({importedItems.length} Dishes)</h3>
              </div>
              <button onClick={() => setShowImportModal(false)} className="text-stone-400 hover:text-stone-600 font-bold text-sm">✕</button>
            </div>

            <p className="text-xs text-stone-500 font-medium">
              Review parsed dishes below. Missing categories will be created automatically in your database.
            </p>

            {/* Preview Table */}
            <div className="flex-1 overflow-y-auto border border-stone-200 rounded-2xl">
              <table className="w-full text-left text-xs font-medium border-collapse">
                <thead>
                  <tr className="bg-stone-100 text-[10px] font-black uppercase text-stone-500 border-b border-stone-200">
                    <th className="px-3 py-2">DISH NAME</th>
                    <th className="px-3 py-2">CATEGORY</th>
                    <th className="px-3 py-2">PRICE</th>
                    <th className="px-3 py-2">DIETARY BADGE</th>
                    <th className="px-3 py-2">SPECIAL</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {importedItems.map((it, idx) => (
                    <tr key={idx} className="hover:bg-stone-50">
                      <td className="px-3 py-2 font-bold text-stone-900">{it.name}</td>
                      <td className="px-3 py-2 text-stone-600">{it.category}</td>
                      <td className="px-3 py-2 font-mono font-bold text-stone-900">{currencySymbol}{it.price}</td>
                      <td className="px-3 py-2">
                        {it.dietaryType === "veg" ? (
                          <span className="text-emerald-700 font-bold text-[10px]">🟢 Veg</span>
                        ) : it.dietaryType === "non-veg" ? (
                          <span className="text-red-700 font-bold text-[10px]">🔴 Non-Veg</span>
                        ) : (
                          <span className="text-stone-400 text-[10px] italic">None</span>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        {it.isChefSpecial ? (
                          <span className="text-amber-600 font-bold text-[10px] flex items-center gap-0.5">
                            <Sparkles className="w-3 h-3" /> Special
                          </span>
                        ) : (
                          <span className="text-stone-400 text-[10px]">No</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between border-t border-stone-100 pt-3 gap-2">
              <button
                onClick={() => setShowImportModal(false)}
                className="px-4 py-2 rounded-xl border border-stone-300 text-xs font-bold text-stone-600 hover:bg-stone-100"
              >
                Cancel
              </button>

              <button
                onClick={handleConfirmImport}
                disabled={importing}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-md shadow-emerald-600/30 flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <Upload className="w-4 h-4" />
                {importing ? "Importing to Database..." : `Confirm & Import ${importedItems.length} Dishes`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
