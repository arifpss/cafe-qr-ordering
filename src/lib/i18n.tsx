import React, { createContext, useContext, useMemo, useState } from "react";

export type Lang = "en" | "bn";

const translations: Record<Lang, Record<string, string>> = {
  en: {
    appName: "Cafe QR Ordering",
    welcome: "Welcome",
    createAccount: "Create account",
    login: "Login",
    logout: "Logout",
    name: "Name",
    email: "Email",
    phone: "Phone",
    phoneOrUsername: "Phone or Username",
    password: "Password",
    confirmPassword: "Confirm password",
    table: "Table",
    categories: "Categories",
    featured: "Featured",
    hot: "Hot",
    trending: "Trending",
    search: "Search",
    addToCart: "Add to cart",
    placeOrder: "Place order",
    orderStatus: "Order status",
    preparing: "Preparing",
    ready: "Ready",
    served: "Served",
    eta: "ETA",
    minutes: "minutes",
    ratingPrompt: "How was your food?",
    submitReview: "Submit review",
    profile: "Profile",
    points: "Points",
    badge: "Badge",
    discount: "Discount",
    orderHistory: "Order history",
    leaderboard: "Leaderboard",
    kitchenView: "Kitchen view",
    frontDesk: "Front desk",
    admin: "Admin",
    allOrders: "All Orders",
    products: "Products",
    categoriesAdmin: "Categories",
    reports: "Reports",
    settings: "Settings",
    theme: "Theme",
    discounts: "Discounts",
    save: "Save",
    status: "Status",
    reviewOptional: "Comment (optional)",
    alreadyHaveAccount: "Already have an account?",
    getStarted: "Get started",
    continueAsGuest: "Continue as guest",
    passwordOptional: "Password (optional, min 3)",
    register: "Register",
    continue: "Continue",
    menu: "Menu",
    cart: "Cart",
    emptyCart: "Your cart is empty",
    total: "Total",
    notes: "Notes",
    placeOrderSuccess: "Order placed",
    orderInProgress: "Order in progress",
    tableCode: "Table code",
    loginAnywhere: "Login from anywhere",
    changePassword: "Change password",
    currentPassword: "Current password",
    newPassword: "New password",
    confirmNewPassword: "Confirm new password",
    mustChangePassword: "Please change your password",
    language: "Language",
    staff: "Staff",
    acceptOrder: "Accept order",
    setEta: "Set ETA",
    markPreparing: "Mark preparing",
    markReady: "Mark ready",
    markServed: "Mark served",
    cancel: "Cancel",
    reviewThanks: "Thanks for your review",
    loginRequiredToOrder: "Please login, create an account, or continue as guest to place an order."
  },
  bn: {
    appName: "ক্যাফে কিউআর অর্ডারিং",
    welcome: "স্বাগতম",
    createAccount: "অ্যাকাউন্ট তৈরি করুন",
    login: "লগইন",
    logout: "লগআউট",
    name: "নাম",
    email: "ইমেইল",
    phone: "ফোন",
    phoneOrUsername: "ফোন বা ইউজারনেম",
    password: "পাসওয়ার্ড",
    confirmPassword: "পাসওয়ার্ড নিশ্চিত করুন",
    table: "টেবিল",
    categories: "ক্যাটাগরি",
    featured: "ফিচার্ড",
    hot: "হট",
    trending: "ট্রেন্ডিং",
    search: "সার্চ",
    addToCart: "কার্টে যোগ করুন",
    placeOrder: "অর্ডার করুন",
    orderStatus: "অর্ডার স্ট্যাটাস",
    preparing: "প্রস্তুত হচ্ছে",
    ready: "রেডি",
    served: "সার্ভড",
    eta: "সময়",
    minutes: "মিনিট",
    ratingPrompt: "আপনার খাবার কেমন ছিল?",
    submitReview: "রিভিউ দিন",
    profile: "প্রোফাইল",
    points: "পয়েন্ট",
    badge: "ব্যাজ",
    discount: "ডিসকাউন্ট",
    orderHistory: "অর্ডার ইতিহাস",
    leaderboard: "লিডারবোর্ড",
    kitchenView: "কিচেন ভিউ",
    frontDesk: "ফ্রন্ট ডেস্ক",
    admin: "অ্যাডমিন",
    allOrders: "সব অর্ডার",
    products: "পণ্যসমূহ",
    categoriesAdmin: "ক্যাটাগরি",
    reports: "রিপোর্ট",
    settings: "সেটিংস",
    theme: "থিম",
    discounts: "ডিসকাউন্টস",
    save: "সেভ",
    status: "স্ট্যাটাস",
    reviewOptional: "কমেন্ট (ঐচ্ছিক)",
    alreadyHaveAccount: "আগে থেকে অ্যাকাউন্ট আছে?",
    getStarted: "শুরু করুন",
    continueAsGuest: "গেস্ট হিসেবে চালিয়ে যান",
    passwordOptional: "পাসওয়ার্ড (ঐচ্ছিক, কমপক্ষে ৩)",
    register: "রেজিস্টার",
    continue: "চালিয়ে যান",
    menu: "মেনু",
    cart: "কার্ট",
    emptyCart: "আপনার কার্ট খালি",
    total: "মোট",
    notes: "নোট",
    placeOrderSuccess: "অর্ডার প্লেসড",
    orderInProgress: "অর্ডার চলছে",
    tableCode: "টেবিল কোড",
    loginAnywhere: "যেকোনো স্থান থেকে লগইন করুন",
    changePassword: "পাসওয়ার্ড পরিবর্তন",
    currentPassword: "বর্তমান পাসওয়ার্ড",
    newPassword: "নতুন পাসওয়ার্ড",
    confirmNewPassword: "নতুন পাসওয়ার্ড নিশ্চিত করুন",
    mustChangePassword: "অনুগ্রহ করে পাসওয়ার্ড পরিবর্তন করুন",
    language: "ভাষা",
    staff: "স্টাফ",
    acceptOrder: "অর্ডার গ্রহণ",
    setEta: "ইটিএ সেট করুন",
    markPreparing: "প্রস্তুত শুরু",
    markReady: "রেডি করুন",
    markServed: "সার্ভড করুন",
    cancel: "বাতিল",
    reviewThanks: "রিভিউর জন্য ধন্যবাদ",
    loginRequiredToOrder: "অর্ডার করতে লগইন, অ্যাকাউন্ট তৈরি, অথবা গেস্ট হিসেবে চালিয়ে যান।"
  }
};

interface I18nContextValue {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: string) => string;
}

const I18nContext = createContext<I18nContextValue | undefined>(undefined);

export const I18nProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [lang, setLangState] = useState<Lang>(() => {
    const stored = localStorage.getItem("cafe_lang");
    return stored === "bn" ? "bn" : "en";
  });

  const setLang = (next: Lang) => {
    setLangState(next);
    localStorage.setItem("cafe_lang", next);
  };

  const value = useMemo(() => {
    return {
      lang,
      setLang,
      t: (key: string) => translations[lang][key] ?? key
    };
  }, [lang]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
};

export const useI18n = () => {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error("useI18n must be used within I18nProvider");
  }
  return ctx;
};
