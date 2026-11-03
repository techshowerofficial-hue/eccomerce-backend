
import userModel from "../models/userModel.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import validator from "validator";

const createToken = (id) => {
  return jwt.sign(
    { id: id.toString() },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
};

// REGISTER
export const registerUser = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name?.trim() || !email?.trim() || !password) {
      return res.status(400).json({
        success: false,
        message: "Please fill all required fields.",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    if (!validator.isEmail(normalizedEmail)) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid email address.",
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: "Password must contain at least 8 characters.",
      });
    }

    const existingUser = await userModel.findOne({
      email: normalizedEmail,
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "An account with this email already exists.",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await userModel.create({
      name: name.trim(),
      email: normalizedEmail,
      password: hashedPassword,
    });

    const token = createToken(user._id);

    return res.status(201).json({
      success: true,
      message: "Account created successfully.",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
      },
    });
  } catch (error) {
    console.error("Register error:", error);

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "This email is already registered.",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Unable to create account.",
    });
  }
};

// LOGIN
export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email?.trim() || !password) {
      return res.status(400).json({
        success: false,
        message: "Please enter your email and password.",
      });
    }

    const user = await userModel.findOne({
      email: email.trim().toLowerCase(),
    });

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password.",
      });
    }

    const token = createToken(user._id);

    return res.status(200).json({
      success: true,
      message: "Login successful.",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
      },
    });
  } catch (error) {
    console.error("Login error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to login. Please try again.",
    });
  }
};

// GET PROFILE
export const getUserProfile = async (req, res) => {
  try {
    const user = await userModel
      .findById(req.userId)
      .select("-password");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    return res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    console.error("Profile error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch profile.",
    });
  }
};

// UPDATE PROFILE
export const updateUserProfile = async (req, res) => {
  try {
    const { name, phone } = req.body;

    if (name !== undefined && !String(name).trim()) {
      return res.status(400).json({
        success: false,
        message: "Name cannot be empty.",
      });
    }

    if (
      phone !== undefined &&
      phone !== "" &&
      !/^[6-9]\d{9}$/.test(String(phone).trim())
    ) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid 10-digit phone number.",
      });
    }

    const update = {};

    if (name !== undefined) update.name = String(name).trim();
    if (phone !== undefined) update.phone = String(phone).trim();

    const user = await userModel
      .findByIdAndUpdate(
        req.userId,
        { $set: update },
        { new: true, runValidators: true }
      )
      .select("-password");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Profile updated successfully.",
      user,
    });
  } catch (error) {
    console.error("Update profile error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to update profile.",
    });
  }
};

// GET ADDRESSES
export const getAddresses = async (req, res) => {
  try {
    const user = await userModel
      .findById(req.userId)
      .select("addresses");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    return res.status(200).json({
      success: true,
      addresses: user.addresses,
    });
  } catch (error) {
    console.error("Get addresses error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch addresses.",
    });
  }
};

// ADD ADDRESS
export const addAddress = async (req, res) => {
  try {
    const {
      fullName,
      phone,
      pincode,
      houseNo,
      area,
      landmark = "",
      city,
      state,
      addressType = "Home",
      isDefault = false,
    } = req.body;

    const requiredFields = {
      fullName,
      phone,
      pincode,
      houseNo,
      area,
      city,
      state,
    };

    for (const [field, value] of Object.entries(requiredFields)) {
      if (!String(value ?? "").trim()) {
        return res.status(400).json({
          success: false,
          message: `${field} is required.`,
        });
      }
    }

    if (!/^[6-9]\d{9}$/.test(String(phone).trim())) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid 10-digit phone number.",
      });
    }

    if (!/^\d{6}$/.test(String(pincode).trim())) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid 6-digit PIN code.",
      });
    }

    if (!["Home", "Work", "Other"].includes(addressType)) {
      return res.status(400).json({
        success: false,
        message: "Invalid address type.",
      });
    }

    const user = await userModel.findById(req.userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    const makeDefault =
      Boolean(isDefault) || user.addresses.length === 0;

    if (makeDefault) {
      user.addresses.forEach((address) => {
        address.isDefault = false;
      });
    }

    user.addresses.push({
      fullName: String(fullName).trim(),
      phone: String(phone).trim(),
      pincode: String(pincode).trim(),
      houseNo: String(houseNo).trim(),
      area: String(area).trim(),
      landmark: String(landmark).trim(),
      city: String(city).trim(),
      state: String(state).trim(),
      addressType,
      isDefault: makeDefault,
    });

    await user.save();

    return res.status(201).json({
      success: true,
      message: "Address saved successfully.",
      addresses: user.addresses,
    });
  } catch (error) {
    console.error("Add address error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to save address.",
    });
  }
};

// UPDATE ADDRESS
export const updateAddress = async (req, res) => {
  try {
    const { addressId } = req.params;
    const allowedFields = [
      "fullName",
      "phone",
      "pincode",
      "houseNo",
      "area",
      "landmark",
      "city",
      "state",
      "addressType",
    ];

    const user = await userModel.findById(req.userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    const address = user.addresses.id(addressId);

    if (!address) {
      return res.status(404).json({
        success: false,
        message: "Address not found.",
      });
    }

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        address[field] =
          typeof req.body[field] === "string"
            ? req.body[field].trim()
            : req.body[field];
      }
    }

    if (
      address.phone &&
      !/^[6-9]\d{9}$/.test(String(address.phone))
    ) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid phone number.",
      });
    }

    if (!/^\d{6}$/.test(String(address.pincode))) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid PIN code.",
      });
    }

    if (
      address.addressType &&
      !["Home", "Work", "Other"].includes(address.addressType)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid address type.",
      });
    }

    if (req.body.isDefault === true || req.body.isDefault === "true") {
      user.addresses.forEach((item) => {
        item.isDefault = item._id.equals(address._id);
      });
    } else if (
      req.body.isDefault === false ||
      req.body.isDefault === "false"
    ) {
      address.isDefault = false;
    }

    await user.save();

    return res.status(200).json({
      success: true,
      message: "Address updated successfully.",
      addresses: user.addresses,
    });
  } catch (error) {
    console.error("Update address error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to update address.",
    });
  }
};

// DELETE ADDRESS
export const deleteAddress = async (req, res) => {
  try {
    const { addressId } = req.params;

    const user = await userModel.findById(req.userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    const address = user.addresses.id(addressId);

    if (!address) {
      return res.status(404).json({
        success: false,
        message: "Address not found.",
      });
    }

    const wasDefault = address.isDefault;

    user.addresses.pull({ _id: addressId });

    if (wasDefault && user.addresses.length > 0) {
      user.addresses[0].isDefault = true;
    }

    await user.save();

    return res.status(200).json({
      success: true,
      message: "Address deleted successfully.",
      addresses: user.addresses,
    });
  } catch (error) {
    console.error("Delete address error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to delete address.",
    });
  }
};

// GET CART
export const getUserCart = async (req, res) => {
  try {
    const user = await userModel.findById(req.userId).select("cartData");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    return res.status(200).json({
      success: true,
      cartData: user.cartData || {},
    });
  } catch (error) {
    console.error("Get cart error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch cart.",
    });
  }
};

// SAVE CART
export const saveUserCart = async (req, res) => {
  try {
    const { cartData } = req.body;

    if (
      !cartData ||
      typeof cartData !== "object" ||
      Array.isArray(cartData)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid cart data.",
      });
    }

    const user = await userModel.findByIdAndUpdate(
      req.userId,
      { $set: { cartData } },
      { new: true }
    ).select("_id");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Cart saved successfully.",
      cartData,
    });
  } catch (error) {
    console.error("Save cart error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to save cart.",
    });
  }
};

