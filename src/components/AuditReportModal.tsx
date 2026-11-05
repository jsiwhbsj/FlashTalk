import React from "react";
import {
  CheckCircle2,
  Wrench,
  Sparkles,
  AlertTriangle,
  X,
  ArrowRight,
  FileCode2,
} from "lucide-react";

interface AuditReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateTab: (tab: string) => void;
  isLightMode: boolean;
}

export const AuditReportModal: React.FC<AuditReportModalProps> = ({
  isOpen,
  onClose,
  onNavigateTab,
  isLightMode,
}) => {
  if (!isOpen) return null;

  const bgSurface = isLightMode
    ? "bg-white text-slate-900 border-slate-200"
    : "bg-[#131c26] text-slate-100 border-[#263545]";
  const cardSurface = isLightMode
    ? "bg-slate-50 border-slate-200"
    : "bg-[#1a2634] border-[#2b3a4c]";
  const mutedText = isLightMode ? "text-slate-600" : "text-slate-400";

  return (
    <div className="fixed inset-0 z-[200] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div
        className={`w-full max-w-4xl max-h-[88vh] rounded-2xl border shadow-2xl flex flex-col overflow-hidden ${bgSurface}`}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-inherit flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-500/15 text-sky-400 flex items-center justify-center">
              <FileCode2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold">
                প্রজেক্ট অডিট ও স্ট্যাটাস রিপোর্ট (FlashTalk Codebase Inspection)
              </h2>
              <p className={`text-xs ${mutedText}`}>
                আপলোড করা hi_10fee816.zip প্রজেক্টের সম্পূর্ণ বিশ্লেষণ ও আপডেট তালিকা
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-500/10 hover:bg-slate-500/20 transition flex items-center gap-1.5"
          >
            <X className="w-4 h-4" /> বন্ধ করুন
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* File Tree Summary */}
          <div className={`p-4 rounded-xl border ${cardSurface}`}>
            <h3 className="text-sm font-bold mb-2 flex items-center gap-2">
              <FileCode2 className="w-4 h-4 text-sky-400" />
              ১. প্রজেক্টের ফাইলগুলোর পরীক্ষা (Inspected Files in hi_10fee816.zip)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              <div className="p-3 rounded-lg bg-sky-500/5 border border-sky-500/20">
                <div className="font-mono font-semibold text-sky-400">
                  hi/index.html (2,242 lines)
                </div>
                <p className={`mt-1 ${mutedText}`}>
                  মূল FlashTalk মেসেঞ্জার অ্যাপ। এর সবগুলো ফিচার অক্ষুণ্ণ রেখে React + TypeScript এ রূপান্তর ও উন্নত করা হয়েছে।
                </p>
              </div>
              <div className="p-3 rounded-lg bg-amber-500/5 border border-amber-500/20">
                <div className="font-mono font-semibold text-amber-400">
                  hi/script.js &amp; hi/style.css
                </div>
                <p className={`mt-1 ${mutedText}`}>
                  মাত্র ৯ লাইনের পুরনো বয়লারপ্লেট কোড (`showMessage` বাটন), যা মূল মেসেঞ্জারের সাথে যুক্ত ছিল না।
                </p>
              </div>
              <div className="p-3 rounded-lg bg-slate-500/5 border border-slate-500/20">
                <div className="font-mono font-semibold">
                  hi/index.html.zip (0 bytes)
                </div>
                <p className={`mt-1 ${mutedText}`}>
                  অপ্রয়োজনীয় খালি জিপ ফাইল (০ বাইট)।
                </p>
              </div>
            </div>
          </div>

          {/* 2 Columns: Working vs Fixed */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Preserved Working Features */}
            <div className={`p-4 rounded-xl border ${cardSurface} space-y-3`}>
              <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>২. আগে থেকে চালু থাকা ফিচার (১০০% সংরক্ষিত)</span>
              </div>
              <ul className="space-y-2 text-xs leading-relaxed">
                <li>
                  • <strong>অ্যাকাউন্ট ও মাল্টি-অ্যাকাউন্ট সুইচিং:</strong> Gmail/Password সাইন-ইন, সাইন-আপ এবং সর্বোচ্চ ৫টি অ্যাকাউন্টের মধ্যে তাৎক্ষণিক পরিবর্তন।
                </li>
                <li>
                  • <strong>৪-ডিজিট পিন লক ও রিকভারি:</strong> সিকিউরিটি পিন সেট করা, লক স্ক্রিন এবং সিক্রেট রিকভারি প্রশ্নের মাধ্যমে পিন রিসেট।
                </li>
                <li>
                  • <strong>রিয়েল-টাইম চ্যাট, রিপ্লাই ও রিঅ্যাকশন:</strong> মেসেজ রিপ্লাই ব্যানার, ইমোজি রিঅ্যাকশন (`❤️`, `👍`, `🔥`), আনরিড কাউন্টার ও পপ সাউন্ড।
                </li>
                <li>
                  • <strong>ভয়েস নোট ও চ্যাট ব্যাকআপ:</strong> মাইক্রোফোনে ভয়েস রেকর্ড করে পাঠানো এবং `.txt` ফাইল হিসেবে চ্যাট ডাউনলোড।
                </li>
                <li>
                  • <strong>ব্লক/আনব্লক ও প্রোফাইল কাস্টমাইজেশন:</strong> ছবি, নাম, বায়ো, ইউজারনেম পরিবর্তন এবং ইউজার ব্লক লিস্ট।
                </li>
              </ul>
            </div>

            {/* Half-Built & Cosmetic Buttons -> Now Fixed */}
            <div className={`p-4 rounded-xl border ${cardSurface} space-y-3`}>
              <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
                <Wrench className="w-4 h-4 shrink-0" />
                <span>৩. অর্ধেক তৈরি ও অকেজো বাটন (এখন সম্পূর্ণ সচল)</span>
              </div>
              <ul className="space-y-2 text-xs leading-relaxed">
                <li>
                  • <strong>ভয়েস ও ভিডিও কল বাটন (`startVoiceCall` / `startVideoCall`):</strong> আগে শুধু নিজের ক্যামেরা অন হতো; এখন Firestore WebRTC সিগন্যালিং ও ইনকামিং কল রিং যুক্ত করা হয়েছে।
                </li>
                <li>
                  • <strong>অ্যাড ফ্রেন্ড (`searchAndAddFriend`):</strong> আগে শুধু ২ জন ডেমো ইউজার খুঁজত; এখন যেকোনো ইউজারনেম/UID দিয়ে নতুন কন্টাক্ট যোগ ও ডাটাবেস সার্চ কাজ করে।
                </li>
                <li>
                  • <strong>পিডিএফ ও ডকুমেন্ট ফাইল (`handleMediaUpload`):</strong> আগে ফাইল পাঠালে শুধু নাম দেখাত; এখন ডাউনলোডযোগ্য ফাইল কার্ড ও সাইজ প্রিভিউ দেখায়।
                </li>
                <li>
                  • <strong>লাইট মোড ও থিম (`handleLightModeToggle`):</strong> আগে লাইট মোডে ভেতরের কার্ড কালো থাকত; এখন সম্পূর্ণ অ্যাপের সব টেক্সট ও কার্ড নিখুঁত লাইট/ডার্ক থিমে পরিবর্তিত হয়।
                </li>
                <li>
                  • <strong>টাইপিং ইন্ডিকেটর ও ইউজারনেম চেক:</strong> এখন রিয়েল-টাইম ডাটাবেস সিঙ্ক ও প্রকৃত ইউজারনেম যাচাইয়ের সাথে যুক্ত।
                </li>
              </ul>
            </div>
          </div>

          {/* Newly Added AI & Google Drive Capabilities */}
          <div className={`p-4 rounded-xl border ${cardSurface} space-y-3`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sky-400 font-bold text-sm">
                <Sparkles className="w-4 h-4 shrink-0" />
                <span>৪. নতুন যুক্ত করা Gemini AI ও Google Drive ফিচারসমূহ</span>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-sky-500/10 border border-sky-500/20 flex flex-col justify-between">
                <div>
                  <div className="font-bold text-sky-400 mb-1">
                    Gemini AI Chatbot
                  </div>
                  <p className={mutedText}>
                    মাল্টি-টার্ন চ্যাট থ্রেড, কাস্টম রোল এবং ৩টি মডেল (`gemini-4-argon`, `gemini-3.8-flash`, `gemini-3.1-flash-lite`)।
                  </p>
                </div>
                <button
                  onClick={() => {
                    onNavigateTab("ai-studio");
                    onClose();
                  }}
                  className="mt-3 inline-flex items-center gap-1 text-sky-400 font-semibold hover:underline"
                >
                  ওপেন করুন <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex flex-col justify-between">
                <div>
                  <div className="font-bold text-indigo-400 mb-1">
                    Image Analysis (Vision)
                  </div>
                  <p className={mutedText}>
                    যেকোনো ছবি আপলোড করে `gemini-4-argon` দিয়ে বাংলা ও ইংরেজিতে বিশ্লেষণ ও টেক্সট এক্সট্রাক্ট।
                  </p>
                </div>
                <button
                  onClick={() => {
                    onNavigateTab("ai-studio");
                    onClose();
                  }}
                  className="mt-3 inline-flex items-center gap-1 text-indigo-400 font-semibold hover:underline"
                >
                  ছবি বিশ্লেষণ করুন <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex flex-col justify-between">
                <div>
                  <div className="font-bold text-emerald-400 mb-1">
                    Text-to-Speech (TTS)
                  </div>
                  <p className={mutedText}>
                    `gemini-3.8-flash-tts` মডেল দিয়ে যেকোনো চ্যাট মেসেজ বা টেক্সট প্রাকৃতিক কণ্ঠে শোনা ও ডাউনলোড।
                  </p>
                </div>
                <button
                  onClick={() => {
                    onNavigateTab("ai-studio");
                    onClose();
                  }}
                  className="mt-3 inline-flex items-center gap-1 text-emerald-400 font-semibold hover:underline"
                >
                  ভয়েস স্টুডিও <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 flex flex-col justify-between">
                <div>
                  <div className="font-bold text-amber-400 mb-1">
                    Google Drive Sync
                  </div>
                  <p className={mutedText}>
                    Google অ্যাকাউন্ট দিয়ে সাইন-ইন করে ফাইল ব্রাউজ, চ্যাটে শেয়ার এবং ক্লাউডে চ্যাট ব্যাকআপ সংরক্ষণ।
                  </p>
                </div>
                <button
                  onClick={() => {
                    onNavigateTab("drive");
                    onClose();
                  }}
                  className="mt-3 inline-flex items-center gap-1 text-amber-400 font-semibold hover:underline"
                >
                  ড্রাইভ খুলুন <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Note on Paid Model Key */}
          <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-start gap-3 text-xs">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-amber-300">
                মডেল ব্যবহারের নির্দেশিকা:
              </span>{" "}
              <span className={mutedText}>
                জটিল কাজ ও ছবি বিশ্লেষণের জন্য অ্যাপে <code>gemini-4-argon</code> যুক্ত করা হয়েছে। ফ্রি টিয়ারে দ্রুত উত্তরের জন্য চ্যাটবটে <code>gemini-3.8-flash</code> বা <code>gemini-3.1-flash-lite</code> যেকোনো সময় বেছে নেওয়া যাবে।
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
