import Supplier from "../models/Supplier.js";

const toApiSupplier = (doc) => ({
  id: doc._id.toString(),
  supplier_name: doc.supplierName,
  contact_person: doc.contactPerson || null,
  phone: doc.phone || null,
  email: doc.email || null,
  address: doc.address || null,
  status: doc.status,
  notes: doc.notes || null,
  created_at: doc.createdAt,
  updated_at: doc.updatedAt,
});

export const createSupplier = async (req, res) => {
  try {
    const {
      supplier_name,
      contact_person,
      phone,
      email,
      address,
      status = "Active",
      notes,
    } = req.body;

    if (!supplier_name || !supplier_name.trim()) {
      return res.status(400).json({
        success: false,
        message: "Supplier name is required",
      });
    }

    if (!["Active", "Inactive"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid supplier status",
      });
    }

    const supplier = await Supplier.create({
      supplierName: supplier_name.trim(),
      contactPerson: contact_person?.trim() || "",
      phone: phone?.trim() || "",
      email: email?.trim() || "",
      address: address?.trim() || "",
      status,
      notes: notes?.trim() || "",
    });

    return res.status(201).json({
      success: true,
      message: "Supplier created successfully",
      data: {
        id: supplier._id.toString(),
      },
    });
  } catch (error) {
    console.error("Create supplier error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export const getAllSuppliers = async (req, res) => {
  try {
    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.max(Number(req.query.limit) || 10, 1);
    const search = req.query.search?.trim() || "";
    const status = req.query.status?.trim() || "";

    const offset = (page - 1) * limit;

    const allowedStatuses = ["Active", "Inactive"];

    if (status && !allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid supplier status",
      });
    }

    const baseFilter = {};

    if (search) {
      const regex = new RegExp(search, "i");
      baseFilter.$or = [
        { supplierName: regex },
        { contactPerson: regex },
        { phone: regex },
        { email: regex },
      ];
    }

    const filter = { ...baseFilter, ...(status ? { status } : {}) };

    const [totalCount, statsAgg, suppliers] = await Promise.all([
      Supplier.countDocuments(filter),
      Supplier.aggregate([
        { $match: baseFilter },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            active: { $sum: { $cond: [{ $eq: ["$status", "Active"] }, 1, 0] } },
            inactive: {
              $sum: { $cond: [{ $eq: ["$status", "Inactive"] }, 1, 0] },
            },
          },
        },
      ]),
      Supplier.find(filter).sort({ createdAt: -1 }).skip(offset).limit(limit),
    ]);

    const stats = statsAgg[0] || { total: 0, active: 0, inactive: 0 };

    return res.status(200).json({
      success: true,
      data: suppliers.map(toApiSupplier),
      totalCount,
      page,
      limit,
      totalPages: Math.ceil(totalCount / limit),
      stats: {
        total: stats.total,
        active: stats.active,
        inactive: stats.inactive,
      },
    });
  } catch (error) {
    console.error("Get suppliers error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export const getSupplierById = async (req, res) => {
  try {
    const { id } = req.params;

    const supplier = await Supplier.findById(id);

    if (!supplier) {
      return res.status(404).json({
        success: false,
        message: "Supplier not found",
      });
    }

    return res.json({
      success: true,
      data: toApiSupplier(supplier),
    });
  } catch (error) {
    console.error("Get supplier error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export const updateSupplier = async (req, res) => {
  try {
    const { id } = req.params;

    const existingSupplier = await Supplier.findById(id);

    if (!existingSupplier) {
      return res.status(404).json({
        success: false,
        message: "Supplier not found",
      });
    }

    const {
      supplier_name,
      contact_person,
      phone,
      email,
      address,
      status,
      notes,
    } = req.body;

    const updatedStatus = status ?? existingSupplier.status;

    if (!["Active", "Inactive"].includes(updatedStatus)) {
      return res.status(400).json({
        success: false,
        message: "Invalid supplier status",
      });
    }

    const updatedSupplierName =
      supplier_name !== undefined
        ? supplier_name.trim()
        : existingSupplier.supplierName;

    if (!updatedSupplierName) {
      return res.status(400).json({
        success: false,
        message: "Supplier name is required",
      });
    }

    existingSupplier.supplierName = updatedSupplierName;
    existingSupplier.contactPerson =
      contact_person !== undefined
        ? contact_person?.trim() || ""
        : existingSupplier.contactPerson;
    existingSupplier.phone =
      phone !== undefined ? phone?.trim() || "" : existingSupplier.phone;
    existingSupplier.email =
      email !== undefined ? email?.trim() || "" : existingSupplier.email;
    existingSupplier.address =
      address !== undefined ? address?.trim() || "" : existingSupplier.address;
    existingSupplier.status = updatedStatus;
    existingSupplier.notes =
      notes !== undefined ? notes?.trim() || "" : existingSupplier.notes;

    await existingSupplier.save();

    return res.json({
      success: true,
      message: "Supplier updated successfully",
    });
  } catch (error) {
    console.error("Update supplier error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export const deleteSupplier = async (req, res) => {
  try {
    const { id } = req.params;

    const existingSupplier = await Supplier.findById(id);

    if (!existingSupplier) {
      return res.status(404).json({
        success: false,
        message: "Supplier not found",
      });
    }

    await Supplier.findByIdAndDelete(id);

    return res.json({
      success: true,
      message: "Supplier deleted successfully",
    });
  } catch (error) {
    console.error("Delete supplier error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};
