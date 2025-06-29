
export const persianTexts = {
  // Authentication
  auth: {
    title: "دستیار هوش مصنوعی چت",
    signIn: "ورود",
    signUp: "ثبت‌نام",
    email: "ایمیل",
    password: "رمز عبور",
    fullName: "نام کامل",
    signingIn: "در حال ورود...",
    creatingAccount: "در حال ایجاد حساب...",
    forgotPassword: "رمز عبور را فراموش کرده‌اید؟",
    resetPassword: "بازیابی رمز عبور",
    sending: "در حال ارسال...",
    sendResetEmail: "ارسال ایمیل بازیابی",
    backToLogin: "بازگشت به ورود",
    signUpError: "خطا در ثبت‌نام",
    signInError: "خطا در ورود",
    resetError: "خطا در بازیابی",
    success: "موفق",
    confirmEmail: "لطفاً ایمیل خود را برای تأیید حساب بررسی کنید",
    resetEmailSent: "ایمیل بازیابی رمز عبور ارسال شد! صندوق ورودی خود را بررسی کنید."
  },

  // Chat Interface
  chat: {
    title: "دستیار هوش مصنوعی چت",
    model: "مدل:",
    imageMode: "حالت تصویر:",
    typePlaceholder: "پیام خود را تایپ کنید...",
    imagePlaceholder: "تصویری که می‌خواهید تولید شود را توضیح دهید...",
    imageModeActive: "حالت تصویر فعال است - پیام شما برای تولید تصویر استفاده خواهد شد",
    hello: "سلام! من دستیار هوش مصنوعی شما هستم. می‌توانم با شما چت کنم و با استفاده از DALL·E 3 تصویر بسازم. امروز چطور می‌توانم کمکتان کنم؟",
    error: "خطا",
    errorMessage: "دریافت پاسخ از هوش مصنوعی با شکست مواجه شد. لطفاً دوباره تلاش کنید.",
    imageGenerated: "بر اساس درخواست شما تصویری تولید کردم:",
    chatHistory: "تاریخچه گفتگو",
    newChat: "گفتگوی جدید",
    noHistory: "هنوز تاریخچه گفتگویی وجود ندارد"
  },

  // Account Management
  account: {
    title: "تنظیمات حساب",
    subtitle: "مدیریت پروفایل و اشتراک خود",
    backToChat: "بازگشت به چت",
    signOut: "خروج",
    profileInfo: "اطلاعات پروفایل",
    fullName: "نام کامل",
    email: "ایمیل",
    updating: "در حال به‌روزرسانی...",
    updateProfile: "به‌روزرسانی پروفایل",
    subscriptionPlan: "طرح اشتراک",
    freePlan: "طرح رایگان",
    proPlan: "طرح حرفه‌ای",
    active: "فعال",
    inactive: "غیرفعال",
    premiumUnlocked: "امکانات پریمیوم فعال شده",
    limitedFeatures: "امکانات محدود در دسترس",
    expires: "انقضا:",
    upgradeToPro: "ارتقا به حرفه‌ای",
    usageStats: "آمار استفاده",
    chatMessages: "پیام‌های چت",
    imagesGenerated: "تصاویر تولید شده",
    usageResets: "استفاده ماهانه بازنشانی می‌شود در",
    loading: "در حال بارگذاری...",
    error: "خطا",
    errorLoadingData: "بارگذاری اطلاعات حساب با شکست مواجه شد",
    profileUpdated: "پروفایل با موفقیت به‌روزرسانی شد",
    updateError: "به‌روزرسانی پروفایل با شکست مواجه شد"
  },

  // Payment
  payment: {
    title: "انتخاب طرح شما",
    subtitle: "برای دسترسی به امکانات پریمیوم ارتقا دهید",
    backToAccount: "بازگشت به حساب",
    mostPopular: "محبوب‌ترین",
    currentPlan: "طرح فعلی",
    upgradeNow: "اکنون ارتقا دهید",
    processing: "در حال پردازش...",
    month: "ماه",
    toman: "تومان",
    
    // Plan Features
    features: {
      free: [
        "۵۰ پیام چت در ماه", 
        "۵ تولید تصویر در ماه", 
        "مدل‌های هوش مصنوعی پایه", 
        "پشتیبانی استاندارد"
      ],
      pro: [
        "۱۰۰۰ پیام چت در ماه",
        "۱۰۰ تولید تصویر در ماه", 
        "مدل‌های هوش مصنوعی پریمیوم (GPT-4o)",
        "پشتیبانی اولویت‌دار",
        "کیفیت تصویر پیشرفته",
        "بدون تبلیغات"
      ]
    },

    paymentInfo: "اطلاعات پرداخت",
    securePayment: "پردازش امن پرداخت",
    moneyBack: "ضمانت بازگشت وجه ۳۰ روزه",
    cancelAnytime: "لغو در هر زمان",
    instantActivation: "فعال‌سازی فوری",
    demoNote: "توجه: این یک سیستم پرداخت نمایشی است. در محیط تولید، این سیستم با Pay.ir یا Zarinpal برای پردازش امن پرداخت ادغام خواهد شد.",
    
    paymentSuccessful: "پرداخت موفق!",
    planUpgraded: "طرح شما به حرفه‌ای ارتقا یافت. در حال انتقال به صفحه حساب...",
    paymentFailed: "پرداخت ناموفق",
    paymentError: "خطایی در پردازش پرداخت رخ داد. لطفاً دوباره تلاش کنید."
  },

  // Common
  common: {
    success: "موفق",
    error: "خطا", 
    loading: "در حال بارگذاری...",
    cancel: "لغو",
    confirm: "تأیید",
    save: "ذخیره",
    back: "بازگشت"
  }
};

export type TextKey = keyof typeof persianTexts;
export const t = persianTexts;
