import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";

export type Language = "tr" | "en" | "ru";

const translations = {
  tr: {
    // General
    loading: "Yükleniyor...",
    logout: "Çıkış",
    save: "Kaydet",
    cancel: "İptal",
    delete: "Sil",
    reset: "Sıfırla",
    search: "Ara",
    close: "Kapat",
    back: "Geri",
    next: "İleri",
    confirm: "Onayla",
    yes: "Evet",
    no: "Hayır",
    error: "Hata",
    success: "Başarılı",
    
    // Auth
    login: "Giriş Yap",
    signup: "Kayıt Ol",
    email: "E-posta",
    password: "Şifre",
    displayName: "Kullanıcı Adı",
    noAccount: "Hesabın yok mu?",
    hasAccount: "Hesabın var mı?",
    buyer: "Alıcı",
    vendor: "Satıcı",
    admin: "Admin",
    loginSubtitle: "Güvenli giriş",
    signupSubtitle: "Yeni hesap oluştur",
    selectRole: "Rol seç",
    mfaCode: "MFA Kodu",
    mfaVerify: "Doğrula",
    accountNoRole: "Hesap yetkisi yüklenemedi.",
    
    // Sidebar
    dashboard: "Dashboard",
    securityLogs: "Security Logs",
    disputes: "Anlaşmazlıklar",
    transactions: "İşlemler",
    forum: "Forum",
    security: "Güvenlik",
    customize: "Özelleştir",
    myProducts: "Ürünlerim",
    wallet: "Cüzdan",
    deposit: "Depozito",
    profile: "Profil",
    market: "Market",
    myOrders: "Siparişlerim",
    store: "Mağaza",
    watchlist: "Favoriler",
    
    // Customization
    customization: "Özelleştirme",
    themeColor: "Tema Rengi",
    font: "Yazı Tipi",
    fontFamily: "Font",
    fontSize: "Boyut",
    small: "Küçük",
    normal: "Normal",
    large: "Büyük",
    animations: "Animasyon Ayarları",
    neonEffects: "Neon efektleri",
    animationsToggle: "Animasyonlar",
    sidebarLayout: "Sidebar Düzeni",
    position: "Pozisyon",
    left: "Sol",
    right: "Sağ",
    collapseSidebar: "Sidebar daralt",
    backgroundImage: "Arka Plan Resmi",
    changeImage: "Değiştir",
    selectImage: "Resim Seç",
    removeImage: "Kaldır",
    opacity: "Opaklık",
    customHue: "Özel Renk Tonu",
    resetSettings: "Ayarlar sıfırlandı",
    themeApplied: "teması uygulandı",
    bgUpdated: "Arka plan güncellendi! 🎨",
    bgRemoved: "Arka plan kaldırıldı",
    language: "Dil",
    selectLanguage: "Dil Seçimi",
    systemFont: "Sistem Fontu",
    
    // Colors
    red: "Kırmızı",
    blue: "Mavi",
    green: "Yeşil",
    purple: "Mor",
    orange: "Turuncu",
    cyan: "Camgöbeği",
    pink: "Pembe",
    yellow: "Sarı",
    
    // Notifications
    notifications: "Bildirimler",
    noNotifications: "Bildirim yok",
    markAllRead: "Tümünü okundu işaretle",
    
    // Formats
    supportedFormats: "Desteklenen formatlar: JPG, PNG, GIF, WebP",
    maxFileSize: "Maksimum dosya boyutu: 10MB",
  },
  en: {
    loading: "Loading...",
    logout: "Logout",
    save: "Save",
    cancel: "Cancel",
    delete: "Delete",
    reset: "Reset",
    search: "Search",
    close: "Close",
    back: "Back",
    next: "Next",
    confirm: "Confirm",
    yes: "Yes",
    no: "No",
    error: "Error",
    success: "Success",
    
    login: "Login",
    signup: "Sign Up",
    email: "Email",
    password: "Password",
    displayName: "Display Name",
    noAccount: "Don't have an account?",
    hasAccount: "Already have an account?",
    buyer: "Buyer",
    vendor: "Vendor",
    admin: "Admin",
    loginSubtitle: "Secure login",
    signupSubtitle: "Create new account",
    selectRole: "Select role",
    mfaCode: "MFA Code",
    mfaVerify: "Verify",
    accountNoRole: "Could not load account permissions.",
    
    dashboard: "Dashboard",
    securityLogs: "Security Logs",
    disputes: "Disputes",
    transactions: "Transactions",
    forum: "Forum",
    security: "Security",
    customize: "Customize",
    myProducts: "My Products",
    wallet: "Wallet",
    deposit: "Bond",
    profile: "Profile",
    market: "Market",
    myOrders: "My Orders",
    store: "Store",
    watchlist: "Watchlist",
    
    customization: "Customization",
    themeColor: "Theme Color",
    font: "Font",
    fontFamily: "Font",
    fontSize: "Size",
    small: "Small",
    normal: "Normal",
    large: "Large",
    animations: "Animation Settings",
    neonEffects: "Neon effects",
    animationsToggle: "Animations",
    sidebarLayout: "Sidebar Layout",
    position: "Position",
    left: "Left",
    right: "Right",
    collapseSidebar: "Collapse sidebar",
    backgroundImage: "Background Image",
    changeImage: "Change",
    selectImage: "Select Image",
    removeImage: "Remove",
    opacity: "Opacity",
    customHue: "Custom Hue",
    resetSettings: "Settings reset",
    themeApplied: "theme applied",
    bgUpdated: "Background updated! 🎨",
    bgRemoved: "Background removed",
    language: "Language",
    selectLanguage: "Language Selection",
    systemFont: "System Font",
    
    red: "Red",
    blue: "Blue",
    green: "Green",
    purple: "Purple",
    orange: "Orange",
    cyan: "Cyan",
    pink: "Pink",
    yellow: "Yellow",
    
    notifications: "Notifications",
    noNotifications: "No notifications",
    markAllRead: "Mark all as read",
    
    supportedFormats: "Supported formats: JPG, PNG, GIF, WebP",
    maxFileSize: "Maximum file size: 10MB",
  },
  ru: {
    loading: "Загрузка...",
    logout: "Выход",
    save: "Сохранить",
    cancel: "Отмена",
    delete: "Удалить",
    reset: "Сбросить",
    search: "Поиск",
    close: "Закрыть",
    back: "Назад",
    next: "Далее",
    confirm: "Подтвердить",
    yes: "Да",
    no: "Нет",
    error: "Ошибка",
    success: "Успешно",
    
    login: "Войти",
    signup: "Регистрация",
    email: "Электронная почта",
    password: "Пароль",
    displayName: "Имя пользователя",
    noAccount: "Нет аккаунта?",
    hasAccount: "Уже есть аккаунт?",
    buyer: "Покупатель",
    vendor: "Продавец",
    admin: "Админ",
    loginSubtitle: "Безопасный вход",
    signupSubtitle: "Создать новый аккаунт",
    selectRole: "Выберите роль",
    mfaCode: "Код MFA",
    mfaVerify: "Подтвердить",
    accountNoRole: "Не удалось загрузить разрешения аккаунта.",
    
    dashboard: "Панель управления",
    securityLogs: "Журнал безопасности",
    disputes: "Споры",
    transactions: "Транзакции",
    forum: "Форум",
    security: "Безопасность",
    customize: "Настройки",
    myProducts: "Мои товары",
    wallet: "Кошелёк",
    deposit: "Депозит",
    profile: "Профиль",
    market: "Маркет",
    myOrders: "Мои заказы",
    store: "Магазин",
    watchlist: "Избранное",
    
    customization: "Настройка",
    themeColor: "Цвет темы",
    font: "Шрифт",
    fontFamily: "Шрифт",
    fontSize: "Размер",
    small: "Маленький",
    normal: "Нормальный",
    large: "Большой",
    animations: "Настройки анимации",
    neonEffects: "Неоновые эффекты",
    animationsToggle: "Анимации",
    sidebarLayout: "Расположение панели",
    position: "Позиция",
    left: "Слева",
    right: "Справа",
    collapseSidebar: "Свернуть панель",
    backgroundImage: "Фоновое изображение",
    changeImage: "Изменить",
    selectImage: "Выбрать изображение",
    removeImage: "Удалить",
    opacity: "Прозрачность",
    customHue: "Пользовательский оттенок",
    resetSettings: "Настройки сброшены",
    themeApplied: "тема применена",
    bgUpdated: "Фон обновлён! 🎨",
    bgRemoved: "Фон удалён",
    language: "Язык",
    selectLanguage: "Выбор языка",
    systemFont: "Системный шрифт",
    
    red: "Красный",
    blue: "Синий",
    green: "Зелёный",
    purple: "Фиолетовый",
    orange: "Оранжевый",
    cyan: "Бирюзовый",
    pink: "Розовый",
    yellow: "Жёлтый",
    
    notifications: "Уведомления",
    noNotifications: "Нет уведомлений",
    markAllRead: "Отметить все как прочитанные",
    
    supportedFormats: "Поддерживаемые форматы: JPG, PNG, GIF, WebP",
    maxFileSize: "Максимальный размер файла: 10МБ",
  },
} as const;

export type TranslationKey = keyof typeof translations.tr;

interface I18nContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: TranslationKey) => string;
}

const I18nContext = createContext<I18nContextType>({
  language: "tr",
  setLanguage: () => {},
  t: (key) => key,
});

export const useI18n = () => useContext(I18nContext);

const LANG_KEY = "app_language";

export function I18nProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    if (typeof window === "undefined") return "tr";
    try {
      const stored = window.localStorage.getItem(LANG_KEY) as Language;
      return stored && ["tr", "en", "ru"].includes(stored) ? stored : "tr";
    } catch {
      return "tr";
    }
  });

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem(LANG_KEY, lang);
    document.documentElement.lang = lang;
  }, []);

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  const t = useCallback((key: TranslationKey): string => {
    return translations[language][key] || translations.tr[key] || key;
  }, [language]);

  return (
    <I18nContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export const languageOptions: { value: Language; label: string; flag: string }[] = [
  { value: "tr", label: "Türkçe", flag: "🇹🇷" },
  { value: "en", label: "English", flag: "🇬🇧" },
  { value: "ru", label: "Русский", flag: "🇷🇺" },
];
