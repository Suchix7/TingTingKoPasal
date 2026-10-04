import StoreInfo from "../models/StoreInfo.js";

const toApiStore = (doc) => ({
  id: doc._id.toString(),
  store_name: doc.storeName,
  address: doc.address,
  phone: doc.phone,
  pan_vat_number: doc.panVatNumber,
  created_at: doc.createdAt,
  updated_at: doc.updatedAt,
});

export const createStore = async (req, res) => {
  try {
    const { store_name, address, phone, pan_vat_number } = req.body;

    if (!store_name || !address || !phone || !pan_vat_number) {
      return res.status(400).json({
        success: false,
        message: "Please provide all required fields",
      });
    }

    const trimmedStoreName = store_name.trim();
    const trimmedAddress = address.trim();
    const trimmedPhone = phone.trim();
    const trimmedPanVatNumber = pan_vat_number.trim();

    if (
      !trimmedStoreName ||
      !trimmedAddress ||
      !trimmedPhone ||
      !trimmedPanVatNumber
    ) {
      return res.status(400).json({
        success: false,
        message: "All store fields are required",
      });
    }

    const existingStore = await StoreInfo.findOne();

    if (existingStore) {
      return res.status(409).json({
        success: false,
        message: "Store information already exists",
      });
    }

    const newStore = await StoreInfo.create({
      storeName: trimmedStoreName,
      address: trimmedAddress,
      phone: trimmedPhone,
      panVatNumber: trimmedPanVatNumber,
    });

    return res.status(201).json({
      success: true,
      message: "Store created successfully",
      data: toApiStore(newStore),
    });
  } catch (error) {
    console.error("Create store error:", error.message);

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "A store with this PAN/VAT number already exists",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export const getStore = async (req, res) => {
  try {
    const store = await StoreInfo.findOne();

    if (!store) {
      return res.status(404).json({
        success: false,
        message: "Store information not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: toApiStore(store),
    });
  } catch (error) {
    console.error("Get store error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export const updateStore = async (req, res) => {
  try {
    const { store_name, address, phone, pan_vat_number } = req.body;

    const existingStore = await StoreInfo.findOne();

    if (!existingStore) {
      return res.status(404).json({
        success: false,
        message: "Store information not found",
      });
    }

    const updatedStoreName =
      store_name !== undefined ? store_name.trim() : existingStore.storeName;

    const updatedAddress =
      address !== undefined ? address.trim() : existingStore.address;

    const updatedPhone =
      phone !== undefined ? phone.trim() : existingStore.phone;

    const updatedPanVatNumber =
      pan_vat_number !== undefined
        ? pan_vat_number.trim()
        : existingStore.panVatNumber;

    if (!updatedStoreName) {
      return res.status(400).json({
        success: false,
        message: "Store name is required",
      });
    }

    if (!updatedAddress) {
      return res.status(400).json({
        success: false,
        message: "Address is required",
      });
    }

    if (!updatedPhone) {
      return res.status(400).json({
        success: false,
        message: "Phone number is required",
      });
    }

    if (!updatedPanVatNumber) {
      return res.status(400).json({
        success: false,
        message: "PAN/VAT number is required",
      });
    }

    existingStore.storeName = updatedStoreName;
    existingStore.address = updatedAddress;
    existingStore.phone = updatedPhone;
    existingStore.panVatNumber = updatedPanVatNumber;

    await existingStore.save();

    return res.status(200).json({
      success: true,
      message: "Store updated successfully",
      data: toApiStore(existingStore),
    });
  } catch (error) {
    console.error("Update store error:", error.message);

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "A store with this PAN/VAT number already exists",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export const deleteStore = async (req, res) => {
  try {
    const existingStore = await StoreInfo.findOne();

    if (!existingStore) {
      return res.status(404).json({
        success: false,
        message: "Store information not found",
      });
    }

    await StoreInfo.deleteOne({ _id: existingStore._id });

    return res.status(200).json({
      success: true,
      message: "Store deleted successfully",
    });
  } catch (error) {
    console.error("Delete store error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};
