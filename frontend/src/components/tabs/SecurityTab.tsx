"use client";

import { useState } from "react";
import {
  Shield,
  Key,
  Lock,
  Eye,
  EyeOff,
  CheckCircle,
  AlertCircle,
  Loader2,
  Fingerprint,
} from "lucide-react";
import toast from "react-hot-toast";
import { useUpdatePasscode } from "@/hooks/useSecurity";

export default function SecurityPage() {
  const { mutateAsync: updatePasscode } = useUpdatePasscode();

  const [oldPasscode, setOldPasscode] = useState("");
  const [newPasscode, setNewPasscode] = useState("");
  const [confirmPasscode, setConfirmPasscode] = useState("");
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const validatePasscode = (passcode: string) => {
    if (passcode.length < 6) {
      return "Passcode must be at least 6 characters";
    }
    if (passcode.length > 20) {
      return "Passcode must be less than 20 characters";
    }
    if (!/^\d+$/.test(passcode)) {
      return "Passcode must contain only numbers";
    }
    return "";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    // Validate inputs
    if (!oldPasscode || !newPasscode || !confirmPasscode) {
      setError("All fields are required");
      return;
    }

    if (oldPasscode === newPasscode) {
      setError("New passcode must be different from current passcode");
      return;
    }

    const validationError = validatePasscode(newPasscode);
    if (validationError) {
      setError(validationError);
      return;
    }

    if (newPasscode !== confirmPasscode) {
      setError("Passcodes do not match");
      return;
    }

    setIsLoading(true);
    try {
      await updatePasscode({ oldPasscode, newPasscode });

      setSuccess("Passcode updated successfully");
      setOldPasscode("");
      setNewPasscode("");
      setConfirmPasscode("");
    } catch (error) {
      const message = "Failed to update passcode. Please try again.";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  const getPasswordStrength = (passcode: string) => {
    if (!passcode) return { strength: 0, label: "", color: "" };
    if (passcode.length < 6) {
      return { strength: 20, label: "Weak", color: "bg-red-500" };
    }
    if (passcode.length >= 6 && passcode.length < 8) {
      return { strength: 40, label: "Fair", color: "bg-yellow-500" };
    }
    if (passcode.length >= 8 && /^\d+$/.test(passcode)) {
      return { strength: 60, label: "Good", color: "bg-blue-500" };
    }
    if (passcode.length >= 10) {
      return { strength: 80, label: "Strong", color: "bg-green-500" };
    }
    return { strength: 100, label: "Very Strong", color: "bg-green-600" };
  };

  const passwordStrength = getPasswordStrength(newPasscode);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="space-y-6 p-6">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Security</h1>
            <p className="mt-1 text-sm text-gray-500">
              Manage your system passcode and security settings
            </p>
          </div>
          <div className="rounded-xl bg-gray-100 p-3">
            <Shield className="h-8 w-8 text-gray-700" />
          </div>
        </div>

        {/* Update Passcode Form */}
        <div className="rounded-2xl border border-gray-200 bg-white p-6">
          <div className="mb-6">
            <h2 className="text-xl font-bold text-gray-900">Update Passcode</h2>
            <p className="mt-1 text-sm text-gray-500">
              Enter your current passcode and set a new one
            </p>
          </div>

          {/* Error/Success Messages */}
          {error && (
            <div className="mb-6 flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-4">
              <AlertCircle className="h-5 w-5 text-red-600" />
              <p className="text-sm font-medium text-red-700">{error}</p>
            </div>
          )}

          {success && (
            <div className="mb-6 flex items-center gap-3 rounded-xl border border-green-200 bg-green-50 p-4">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <p className="text-sm font-medium text-green-700">{success}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Current Passcode */}
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Current Passcode
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type={showOld ? "text" : "password"}
                  value={oldPasscode}
                  onChange={(e) => setOldPasscode(e.target.value)}
                  placeholder="Enter current passcode"
                  className="w-full rounded-xl border border-gray-200 py-2.5 pl-10 pr-12 text-sm outline-none transition focus:border-gray-400 focus:ring-2 focus:ring-gray-100"
                  maxLength={20}
                />
                <button
                  type="button"
                  onClick={() => setShowOld(!showOld)}
                  className="absolute cursor-pointer inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600"
                >
                  {showOld ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>

            {/* New Passcode */}
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                New Passcode
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3">
                  <Key className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type={showNew ? "text" : "password"}
                  value={newPasscode}
                  onChange={(e) => setNewPasscode(e.target.value)}
                  placeholder="Enter new passcode"
                  className="w-full rounded-xl border border-gray-200 py-2.5 pl-10 pr-12 text-sm outline-none transition focus:border-gray-400 focus:ring-2 focus:ring-gray-100"
                  maxLength={20}
                />
                <button
                  type="button"
                  onClick={() => setShowNew(!showNew)}
                  className="absolute cursor-pointer inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600"
                >
                  {showNew ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>

              {/* Password Strength Indicator */}
              {newPasscode && (
                <div className="mt-3">
                  <div className="flex items-center justify-between">
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-200">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${passwordStrength.color}`}
                        style={{ width: `${passwordStrength.strength}%` }}
                      ></div>
                    </div>
                    <span className="ml-3 text-xs font-medium text-gray-600">
                      {passwordStrength.label}
                    </span>
                  </div>
                  <div className="mt-2 flex gap-4 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <span className="inline-block h-1 w-1 rounded-full bg-gray-400"></span>
                      Min 6 digits
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="inline-block h-1 w-1 rounded-full bg-gray-400"></span>
                      Numbers only
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Confirm Passcode */}
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Confirm New Passcode
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type={showConfirm ? "text" : "password"}
                  value={confirmPasscode}
                  onChange={(e) => setConfirmPasscode(e.target.value)}
                  placeholder="Confirm new passcode"
                  className="w-full rounded-xl border border-gray-200 py-2.5 pl-10 pr-12 text-sm outline-none transition focus:border-gray-400 focus:ring-2 focus:ring-gray-100"
                  maxLength={20}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute cursor-pointer inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600"
                >
                  {showConfirm ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>

              {/* Match Indicator */}
              {confirmPasscode && (
                <div className="mt-2">
                  {newPasscode === confirmPasscode ? (
                    <span className="flex items-center gap-1 text-xs font-medium text-green-600">
                      <CheckCircle className="h-3 w-3" />
                      Passcodes match
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-xs font-medium text-red-600">
                      <AlertCircle className="h-3 w-3" />
                      Passcodes do not match
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Submit Button */}
            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => {
                  setOldPasscode("");
                  setNewPasscode("");
                  setConfirmPasscode("");
                  setError("");
                  setSuccess("");
                }}
                className="rounded-xl cursor-pointer border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-gray-900 px-6 py-2.5 text-sm font-medium text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Updating...
                  </>
                ) : (
                  <>
                    <Shield className="h-4 w-4" />
                    Update Passcode
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Security Tips */}
        <div className="rounded-2xl border border-gray-200 bg-white p-6">
          <h3 className="text-lg font-semibold text-gray-900">Security Tips</h3>
          <div className="mt-4 space-y-3">
            {[
              {
                icon: CheckCircle,
                text: "Use a passcode that's at least 6 digits long",
                color: "text-blue-600",
                bg: "bg-blue-50",
              },
              {
                icon: CheckCircle,
                text: "Avoid using sequential or repeated numbers (e.g., 123456, 111111)",
                color: "text-purple-600",
                bg: "bg-purple-50",
              },
              {
                icon: CheckCircle,
                text: "Update your passcode regularly for better security",
                color: "text-green-600",
                bg: "bg-green-50",
              },
              {
                icon: AlertCircle,
                text: "Never share your passcode with anyone",
                color: "text-red-600",
                bg: "bg-red-50",
              },
            ].map((tip, index) => (
              <div key={index} className="flex items-start gap-3">
                <div className={`rounded-lg ${tip.bg} p-1.5`}>
                  <tip.icon className={`h-4 w-4 ${tip.color}`} />
                </div>
                <p className="text-sm text-gray-600">{tip.text}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
