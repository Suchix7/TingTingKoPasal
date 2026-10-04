import Customer from "../models/Customer.js";

const toApiCustomer = (doc) => ({
  id: doc._id.toString(),
  name: doc.name,
  phone: doc.phone || null,
  email: doc.email || null,
  address: doc.address || null,
  credit_amount: doc.creditAmount,
  credit_limit: doc.creditLimit,
  status: doc.status,
  notes: doc.notes || null,
  created_at: doc.createdAt,
  updated_at: doc.updatedAt,
});

export const createCustomer = async (req, res) => {
  try {
    const {
      name,
      phone,
      email,
      address,
      credit_amount = 0,
      credit_limit = 0,
      status = "Active",
      notes,
    } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: "Customer name is required",
      });
    }

    const parsedCreditAmount = Number(credit_amount);
    const parsedCreditLimit = Number(credit_limit);

    if (Number.isNaN(parsedCreditAmount) || Number.isNaN(parsedCreditLimit)) {
      return res.status(400).json({
        success: false,
        message: "Credit amount and credit limit must be valid numbers",
      });
    }

    if (parsedCreditAmount < 0 || parsedCreditLimit < 0) {
      return res.status(400).json({
        success: false,
        message: "Credit amount and credit limit cannot be negative",
      });
    }

    if (!["Active", "Inactive"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid customer status",
      });
    }

    const existingCustomer = await Customer.findOne({
      $or: [
        ...(phone ? [{ phone }] : []),
        ...(email ? [{ email }] : []),
      ],
    });

    if ((phone || email) && existingCustomer) {
      return res.status(409).json({
        success: false,
        message: "Customer with same phone or email already exists",
      });
    }

    const newCustomer = await Customer.create({
      name: name.trim(),
      phone: phone ? phone.trim() : undefined,
      email: email ? email.trim() : undefined,
      address: address ? address.trim() : "",
      creditAmount: parsedCreditAmount,
      creditLimit: parsedCreditLimit,
      status,
      notes: notes ? notes.trim() : "",
    });

    return res.status(201).json({
      success: true,
      message: "Customer created successfully",
      data: toApiCustomer(newCustomer),
    });
  } catch (error) {
    console.error("Create customer error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export const getCustomers = async (req, res) => {
  try {
    const { page, limit, search, status } = req.query;

    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 10;
    const offset = (pageNum - 1) * limitNum;

    const filter = {};

    if (search) {
      const regex = new RegExp(search, "i");
      filter.$or = [{ name: regex }, { phone: regex }, { email: regex }];
    }

    if (status) {
      filter.status = status;
    }

    const [customers, totalCount, statsAgg] = await Promise.all([
      Customer.find(filter)
        .sort({ createdAt: -1 })
        .skip(offset)
        .limit(limitNum),
      Customer.countDocuments(filter),
      Customer.aggregate([
        { $match: filter },
        {
          $group: {
            _id: null,
            activeCustomers: {
              $sum: { $cond: [{ $eq: ["$status", "Active"] }, 1, 0] },
            },
            totalCreditAmount: { $sum: "$creditAmount" },
            overLimitCustomers: {
              $sum: {
                $cond: [{ $gt: ["$creditAmount", "$creditLimit"] }, 1, 0],
              },
            },
          },
        },
      ]),
    ]);

    const stats = statsAgg[0] || {
      activeCustomers: 0,
      totalCreditAmount: 0,
      overLimitCustomers: 0,
    };

    return res.status(200).json({
      success: true,
      totalCount,
      data: customers.map(toApiCustomer),
      stats: {
        activeCustomers: stats.activeCustomers,
        totalCreditAmount: stats.totalCreditAmount,
        overLimitCustomers: stats.overLimitCustomers,
      },
      page: pageNum,
      limit: limitNum,
    });
  } catch (error) {
    console.error("Get customers error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export const getCustomerById = async (req, res) => {
  try {
    const { id } = req.params;

    const customer = await Customer.findById(id);

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Customer not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: toApiCustomer(customer),
    });
  } catch (error) {
    console.error("Get customer by ID error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export const updateCustomer = async (req, res) => {
  try {
    const { id } = req.params;

    const existingCustomer = await Customer.findById(id);

    if (!existingCustomer) {
      return res.status(404).json({
        success: false,
        message: "Customer not found",
      });
    }

    const {
      name,
      phone,
      email,
      address,
      credit_amount,
      credit_limit,
      status,
      notes,
    } = req.body;

    const updatedName = name ?? existingCustomer.name;
    const updatedPhone = phone ?? existingCustomer.phone;
    const updatedEmail = email ?? existingCustomer.email;
    const updatedAddress = address ?? existingCustomer.address;
    const updatedCreditAmount =
      credit_amount === undefined
        ? existingCustomer.creditAmount
        : Number(credit_amount);
    const updatedCreditLimit =
      credit_limit === undefined
        ? existingCustomer.creditLimit
        : Number(credit_limit);
    const updatedStatus = status ?? existingCustomer.status;
    const updatedNotes = notes ?? existingCustomer.notes;

    if (!updatedName) {
      return res.status(400).json({
        success: false,
        message: "Customer name is required",
      });
    }

    if (Number.isNaN(updatedCreditAmount) || Number.isNaN(updatedCreditLimit)) {
      return res.status(400).json({
        success: false,
        message: "Credit amount and credit limit must be valid numbers",
      });
    }

    if (updatedCreditAmount < 0 || updatedCreditLimit < 0) {
      return res.status(400).json({
        success: false,
        message: "Credit amount and credit limit cannot be negative",
      });
    }

    if (!["Active", "Inactive"].includes(updatedStatus)) {
      return res.status(400).json({
        success: false,
        message: "Invalid customer status",
      });
    }

    const duplicateCustomer = await Customer.findOne({
      _id: { $ne: id },
      $or: [
        ...(updatedPhone ? [{ phone: updatedPhone }] : []),
        ...(updatedEmail ? [{ email: updatedEmail }] : []),
      ],
    });

    if ((updatedPhone || updatedEmail) && duplicateCustomer) {
      return res.status(409).json({
        success: false,
        message: "Another customer with same phone or email already exists",
      });
    }

    existingCustomer.name = updatedName.trim();
    existingCustomer.phone = updatedPhone ? updatedPhone.trim() : undefined;
    existingCustomer.email = updatedEmail ? updatedEmail.trim() : undefined;
    existingCustomer.address = updatedAddress ? updatedAddress.trim() : "";
    existingCustomer.creditAmount = updatedCreditAmount;
    existingCustomer.creditLimit = updatedCreditLimit;
    existingCustomer.status = updatedStatus;
    existingCustomer.notes = updatedNotes ? updatedNotes.trim() : "";

    await existingCustomer.save();

    return res.status(200).json({
      success: true,
      message: "Customer updated successfully",
      data: toApiCustomer(existingCustomer),
    });
  } catch (error) {
    console.error("Update customer error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export const deleteCustomer = async (req, res) => {
  try {
    const { id } = req.params;

    const existingCustomer = await Customer.findById(id);

    if (!existingCustomer) {
      return res.status(404).json({
        success: false,
        message: "Customer not found",
      });
    }

    await Customer.findByIdAndDelete(id);

    return res.status(200).json({
      success: true,
      message: "Customer deleted successfully",
    });
  } catch (error) {
    console.error("Delete customer error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};
