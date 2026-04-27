import React, { useState, useEffect, useRef } from 'react';
import { 
  Upload, Image as ImageIcon, Sparkles, AlertCircle, Shield, Zap, Target, Download, 
  RotateCcw, Crosshair, Pencil, Terminal, Plus, X, ChevronDown, Layers, Lock, Unlock, 
  XCircle, Trash2, Info, Cloud, ImagePlus, Activity, Smartphone, MonitorSmartphone, 
  MousePointer2, MoreVertical, PlusSquare, History, ZoomIn, Maximize2, Cpu, Eye, 
  ScanLine, Atom, Home, ArrowRight, Box, Calendar, Ruler, Star, BookOpen, Settings2, Save, Camera, ChevronLeft, ChevronRight, Filter, Paintbrush
} from 'lucide-react';

// --- 클라우드 데이터 저장소 (Firebase) 초기화 및 설정 ---
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, setDoc, onSnapshot, collection, addDoc, deleteDoc, updateDoc } from 'firebase/firestore';

const firebaseConfigStr = typeof __firebase_config !== 'undefined' ? __firebase_config : null;
// 링크(Artifact)가 변경되어도 데이터가 초기화되지 않도록 고정된 클라우드 통합 ID를 사용합니다.
const appId = 'ultra-studio-global-database';

let app, auth, db;
if (firebaseConfigStr) {
  try {
    const firebaseConfig = JSON.parse(firebaseConfigStr);
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
  } catch (e) {
    console.error("Firebase 초기화 오류:", e);
  }
}

const defaultPrompt = "첨부된 모든 피규어 이미지들을 하나의 고급스러운 어두운색 배경지 스튜디오 장면에 자연스럽게 배치하여 합성해줘. 배경만 바꾸고 피규어들의 원래 모습, 비율, 시점은 절대 변경하지 마. 여러 피사체가 조화롭게 배치되도록 구성해줘. 추가 영역 생성 금지. 흰색 바닥 금지.";
const defaultPresets = [
  { id: 'dark', label: '다크 스튜디오', prompt: defaultPrompt },
  { id: 'nebula', label: 'M78 성운', prompt: "첨부된 모든 피규어 이미지들을 별과 빛이 가득한 신비로운 우주 공간(M78 성운) 장면에 합성해줘. 각 피규어에 은은한 우주 빛이 반사되도록 연출해줘. 원본 형태와 구도 절대 유지. 추가영역 생성 금지." },
  { id: 'cyber', label: '사이버 격납고', prompt: "피규어들을 네온사인이 빛나는 근미래 사이버펑크 스타일의 어두운 메카닉 격납고에 있는 것처럼 합성해줘. 피규어들에 네온 조명 효과 추가. 원본 형태와 구도 절대 유지. 추가영역 생성 금지." },
  { id: 'battle', label: '전장의 폭발', prompt: "피규어들 뒤로 거대한 불꽃과 흙먼지가 피어오르는 전장의 폭발 배경을 합성해줘. 드라마틱한 역광 조명과 파편 효과 추가. 원본 형태와 구도 절대 유지. 추가영역 생성 금지." }
];

const defaultCreatePresets = [
  { id: 'c_mech', label: '메카닉 컨셉 아트', prompt: "초고화질, 언리얼 엔진 5 렌더링, 사이버펑크 스타일의 하이테크 메카닉 로봇 컨셉 아트, 8k 해상도, 네온 조명, 시네마틱 라이팅" },
  { id: 'c_space', label: '우주 전장', prompt: "장엄한 우주 공간을 배경으로 한 거대한 전함들의 전투 장면, 폭발 효과, 화려한 레이저 빔, 8k 해상도, 시네마틱 뷰" },
  { id: 'c_fantasy', label: '판타지 풍경', prompt: "신비로운 빛이 감도는 판타지 세계의 거대한 숲과 고대 유적, 신비로운 분위기, 극사실주의 풍경화" }
];

// --- 이미지 압축 유틸리티 함수 ---
const compressImage = (base64Str, maxWidth = 1000, maxHeight = 1000, quality = 0.7) => {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = base64Str;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;

      if (width > height) {
        if (width > maxWidth) {
          height *= maxWidth / width;
          width = maxWidth;
        }
      } else {
        if (height > maxHeight) {
          width *= maxHeight / height;
          height = maxHeight;
        }
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
  });
};

// --- 커스텀 드롭다운 컴포넌트 ---
const UltraDropdown = ({ label, options, value, onChange, onManage, placeholder }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) setIsOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative w-full" ref={dropdownRef}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</span>
        {onManage && (
          <button onClick={onManage} className="p-1 text-slate-500 hover:text-cyan-400 transition-colors">
            <Settings2 size={12} />
          </button>
        )}
      </div>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full bg-black/50 border rounded-xl px-4 py-3 text-sm text-left flex items-center justify-between transition-all ${isOpen ? 'border-cyan-500 shadow-[0_0_15px_rgba(34,211,238,0.2)]' : 'border-slate-700 hover:border-slate-600'}`}
      >
        <span className={value ? "text-white font-bold" : "text-slate-600"}>{value || placeholder}</span>
        <ChevronDown size={16} className={`text-slate-500 transition-transform duration-300 ${isOpen ? 'rotate-180 text-cyan-400' : ''}`} />
      </button>
      {isOpen && (
        <div className="absolute z-[100] mt-2 w-full bg-slate-900 border border-slate-700 rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.8)] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
          <div className="max-h-60 overflow-y-auto custom-scrollbar">
            {options.map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => { onChange(opt); setIsOpen(false); }}
                className={`w-full text-left px-4 py-3 text-xs font-bold uppercase tracking-widest hover:bg-cyan-600 hover:text-white transition-colors border-b border-slate-800 last:border-0 ${value === opt ? 'bg-cyan-900/40 text-cyan-400' : 'text-slate-300'}`}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// --- 커스텀 캘린더 컴포넌트 ---
const UltraCalendar = ({ value, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [viewDate, setViewDate] = useState(new Date(value || new Date()));
  const calendarRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (calendarRef.current && !calendarRef.current.contains(event.target)) setIsOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const daysInMonth = (y, m) => new Date(y, m + 1, 0).getDate();
  const firstDayOfMonth = (y, m) => new Date(y, m, 1).getDay();

  const handlePrevMonth = () => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
  const handleNextMonth = () => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));

  const selectDay = (day) => {
    const y = viewDate.getFullYear();
    const m = String(viewDate.getMonth() + 1).padStart(2, '0');
    const d = String(day).padStart(2, '0');
    onChange(`${y}-${m}-${d}`);
    setIsOpen(false);
  };

  const days = [];
  const totalDays = daysInMonth(viewDate.getFullYear(), viewDate.getMonth());
  const startOffset = firstDayOfMonth(viewDate.getFullYear(), viewDate.getMonth());

  for (let i = 0; i < startOffset; i++) days.push(null);
  for (let d = 1; d <= totalDays; d++) days.push(d);

  return (
    <div className="relative w-full" ref={calendarRef}>
      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">제작 날짜</span>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full bg-black/50 border rounded-xl px-4 py-3 text-sm text-left flex items-center justify-between transition-all ${isOpen ? 'border-cyan-500 shadow-[0_0_15px_rgba(34,211,238,0.2)]' : 'border-slate-700 hover:border-slate-600'}`}
      >
        <span className="text-white font-bold">{value || '날짜 선택'}</span>
        <Calendar size={18} className={`text-slate-500 ${isOpen ? 'text-cyan-400' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute z-[100] mt-2 w-72 bg-slate-900 border border-slate-700 rounded-[1.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.9)] p-4 animate-in fade-in zoom-in-95 duration-200">
          <div className="flex items-center justify-between mb-4 px-2">
            <button type="button" onClick={handlePrevMonth} className="p-1 hover:text-cyan-400 transition-colors"><ChevronLeft size={20} /></button>
            <div className="text-xs font-black text-white uppercase tracking-widest italic">
              {viewDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
            </div>
            <button type="button" onClick={handleNextMonth} className="p-1 hover:text-cyan-400 transition-colors"><ChevronRight size={20} /></button>
          </div>
          <div className="grid grid-cols-7 gap-1 mb-2">
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
              <div key={`day-header-${i}`} className="text-center text-[8px] font-black text-slate-600">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {days.map((day, i) => {
              if (!day) return <div key={`day-cell-${i}`} className="aspect-square flex items-center justify-center"></div>;
              
              const y = viewDate.getFullYear();
              const m = String(viewDate.getMonth() + 1).padStart(2, '0');
              const d = String(day).padStart(2, '0');
              const cellDateStr = `${y}-${m}-${d}`;
              const isSelected = value === cellDateStr;

              return (
                <div key={`day-cell-${i}`} className="aspect-square flex items-center justify-center">
                  <button
                    type="button"
                    onClick={() => selectDay(day)}
                    className={`w-full h-full text-[10px] font-bold rounded-lg transition-all ${isSelected ? 'bg-cyan-600 text-white shadow-[0_0_10px_rgba(8,145,178,0.5)]' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
                  >
                    {day}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

// --- 공통 컴포넌트: 별점 입력 ---
const StarRating = ({ label, value, onChange, disabled }) => (
  <div className="flex flex-col gap-2">
    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</span>
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={disabled}
          onClick={() => onChange(star)}
          className={`transition-all ${star <= value ? 'text-rose-500 scale-110' : 'text-slate-700 hover:text-slate-500'}`}
        >
          <Star size={20} fill={star <= value ? "currentColor" : "none"} />
        </button>
      ))}
    </div>
  </div>
);

// --- 울트라 이미지 뷰어 컴포넌트 ---
const UltraImageViewer = ({ src, isOpen, onClose }) => {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [lastTouch, setLastTouch] = useState({ x: 0, y: 0 });
  const [lastDist, setLastDist] = useState(0);
  const imgRef = useRef(null);
  const overlayRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setScale(1);
      setPosition({ x: 0, y: 0 });
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleTouchStart = (e) => {
    if (e.touches.length === 1) {
      setIsDragging(true);
      setLastTouch({ x: e.touches[0].clientX - position.x, y: e.touches[0].clientY - position.y });
    } else if (e.touches.length === 2) {
      const dist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
      setLastDist(dist);
    }
  };

  const handleTouchMove = (e) => {
    if (e.touches.length === 1 && isDragging) {
      const x = e.touches[0].clientX - lastTouch.x;
      const y = e.touches[0].clientY - lastTouch.y;
      setPosition({ x, y });
    } else if (e.touches.length === 2) {
      const dist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
      if (lastDist > 0) {
        const delta = dist / lastDist;
        setScale(Math.max(1, Math.min(scale * delta, 5)));
      }
      setLastDist(dist);
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    setLastDist(0);
  };

  const handleWheel = (e) => {
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setScale(Math.max(1, Math.min(scale * delta, 5)));
  };

  const handleBackdropClick = (e) => {
    if (overlayRef.current === e.target) onClose();
  };

  return (
    <div 
      ref={overlayRef}
      onClick={handleBackdropClick}
      className="fixed inset-0 z-[300] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 sm:p-8 animate-in fade-in duration-300 touch-none select-none"
    >
      <div 
        className="relative bg-slate-900 border border-slate-700/50 rounded-[2.5rem] w-full max-w-4xl h-full max-h-[85vh] shadow-[0_0_80px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col animate-in zoom-in-95 duration-300"
        onWheel={handleWheel}
      >
        <div className="absolute top-0 left-0 right-0 p-5 flex justify-between items-center bg-gradient-to-b from-slate-900 via-slate-900/80 to-transparent z-10">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-cyan-600 flex items-center justify-center shadow-[0_0_15px_rgba(8,145,178,0.5)]">
              <Maximize2 size={16} className="text-white" />
            </div>
            <div className="flex flex-col">
              <h3 className="text-white font-black uppercase tracking-widest text-[10px]">Ultra Viewer</h3>
              <p className="text-cyan-400 text-[9px] font-mono tracking-widest uppercase">Ratio: {Math.round(scale * 100)}%</p>
            </div>
          </div>
          <button onClick={onClose} className="w-9 h-9 bg-slate-800 hover:bg-cyan-600 text-white rounded-full flex items-center justify-center transition-all border border-slate-700 shadow-xl">
            <X size={18} />
          </button>
        </div>

        <div 
          className="flex-grow w-full flex items-center justify-center overflow-hidden cursor-move bg-black/40"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <img 
            ref={imgRef}
            src={src} 
            alt="Enlarged view" 
            className="max-h-[95%] max-w-[95%] object-contain transition-transform duration-75 select-none pointer-events-none"
            style={{ transform: `translate(${position.x}px, ${position.y}px) scale(${scale})` }}
            draggable={false}
          />
        </div>

        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 px-6 py-2 bg-slate-800/90 border border-slate-700/50 rounded-full backdrop-blur-md flex items-center gap-3 shadow-2xl z-10">
          <button onClick={() => { setScale(1); setPosition({x:0, y:0}); }} className="text-slate-400 hover:text-white transition-colors" title="Reset View">
            <RotateCcw size={16} />
          </button>
          <div className="w-px h-3 bg-slate-700"></div>
          <p className="text-[9px] font-bold text-slate-300 uppercase tracking-widest whitespace-nowrap">Pinch to Zoom / Drag to Pan</p>
        </div>
      </div>
    </div>
  );
};

// --- 설치 가이드 모달 컴포넌트 ---
const InstallGuideModal = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const steps = [
    { icon: <Smartphone className="text-rose-500" />, text: "공유 링크를 복사하여 'Chrome(크롬)' 브라우저 주소창에 붙여넣기 후 이동하세요." },
    { icon: <MousePointer2 className="text-cyan-400" />, text: "앱 화면 하단의 [제미나이 캔버스 사용하기] 버튼을 누르세요." },
    { icon: <MoreVertical className="text-slate-400" />, text: "크롬 브라우저 우측 상단의 [점 3개(메뉴)] 아이콘을 누르세요." },
    { icon: <PlusSquare className="text-rose-500" />, text: "[홈 화면에 추가] 항목을 선택하세요." },
    { icon: <Zap className="text-cyan-400" />, text: "팝업이 뜨면 [설치] 버튼을 누르세요." },
    { icon: <Pencil className="text-slate-200" />, text: "앱 이름을 확인하고 마지막 [설치]를 누르면 완료됩니다!" }
  ];

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-300 select-none">
      <div className="bg-slate-900 border border-slate-700/50 rounded-[2.5rem] w-full max-w-lg shadow-[0_0_80px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col max-h-[90vh]">
        <div className="px-8 py-6 border-b border-slate-800 flex justify-between items-center bg-gradient-to-r from-slate-800/50 to-transparent">
          <div className="flex items-center gap-3">
            <MonitorSmartphone className="text-rose-500" size={24} />
            <h3 className="font-black text-white uppercase tracking-widest text-lg">Mobile Installation Guide</h3>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors p-2 bg-slate-800 rounded-full"><X size={20} /></button>
        </div>
        
        <div className="p-8 overflow-y-auto custom-scrollbar">
          <p className="text-slate-400 text-xs font-bold uppercase tracking-[0.2em] mb-8 text-center bg-slate-800/50 py-2 rounded-full">
            전용 앱처럼 바탕화면에 설치하는 방법
          </p>
          
          <div className="space-y-6">
            {steps.map((step, idx) => (
              <div key={idx} className="flex gap-4 items-start group">
                <div className="flex flex-col items-center">
                  <div className="w-10 h-10 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0 group-hover:border-rose-500/50 transition-colors shadow-lg">
                    {step.icon}
                  </div>
                  {idx !== steps.length - 1 && <div className="w-px h-8 bg-slate-800 mt-2"></div>}
                </div>
                <div className="flex-grow pt-1">
                  <span className="text-[10px] font-black text-rose-500 uppercase tracking-widest block mb-1">Step 0{idx + 1}</span>
                  <p className="text-slate-200 text-sm leading-relaxed font-medium break-keep">{step.text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="p-6 bg-slate-800/30 border-t border-slate-800">
          <button onClick={onClose} className="w-full py-4 bg-rose-600 hover:bg-rose-500 text-white rounded-2xl font-black uppercase tracking-[0.2em] text-sm shadow-[0_0_20px_rgba(225,29,72,0.3)] transition-all active:scale-95">
            가이드 닫기
          </button>
        </div>
      </div>
    </div>
  );
};

// --- 인트로 컴포넌트 (업데이트됨: 깔끔하고 웅장한 타이틀 중심의 시네마틱) ---
const IntroSequence = ({ onComplete }) => {
  const [step, setStep] = useState(0);

  useEffect(() => {
    // 타이밍을 간결하게 압축
    const s1 = setTimeout(() => setStep(1), 100); // 렌더링 직후 바로 서서히 등장 시작
    const s2 = setTimeout(() => setStep(2), 2800); // 등장 후 충분히 보여주고 페이드아웃 시작
    const s3 = setTimeout(() => onComplete(), 3800); // 인트로 종료

    return () => {
      clearTimeout(s1); clearTimeout(s2); clearTimeout(s3);
    };
  }, [onComplete]);

  return (
    <div 
      className={`fixed inset-0 z-[500] flex items-center justify-center bg-[#020202] overflow-hidden cursor-pointer select-none transition-opacity duration-1000 ease-in-out
        ${step >= 2 ? 'opacity-0 pointer-events-none' : 'opacity-100'}
      `}
      onClick={onComplete}
    >
      {/* 극장 스크린 같은 미세 노이즈 질감 */}
      <div className="absolute inset-0 opacity-[0.02] bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0IiBoZWlnaHQ9IjQiPgo8cmVjdCB3aWR0aD0iNCIgaGVpZ2h0PSI0IiBmaWxsPSIjZmZmIiBmaWxsLW9wYWNpdHk9IjAuMDUiLz4KPC9zdmc+')] mix-blend-overlay z-0 pointer-events-none"></div>
      
      {/* 타이틀 뒤를 은은하게 비추는 시네마틱 스포트라이트 글로우 */}
      <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80vw] h-[40vh] rounded-[100%] blur-[120px] transition-all duration-[3000ms] ease-out z-0 pointer-events-none
        ${step >= 1 ? 'opacity-30 scale-100 bg-rose-900/50' : 'opacity-0 scale-50 bg-black'}
      `}></div>

      {/* 중앙 가로 빛줄기 (아나모픽 플레어 느낌) */}
      <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[1px] bg-gradient-to-r from-transparent via-cyan-400/40 to-transparent transition-all duration-[2500ms] ease-out z-0 pointer-events-none
        ${step >= 1 ? 'w-[100vw] opacity-100' : 'w-0 opacity-0'}
      `}></div>

      {/* 메인 타이틀 블록 */}
      <div className={`relative z-10 flex flex-col items-center transition-all duration-[3500ms] cubic-bezier(0.16, 1, 0.3, 1)
        ${step === 0 ? 'opacity-0 scale-110 blur-xl' : ''}
        ${step === 1 ? 'opacity-100 scale-100 blur-0' : ''}
        ${step === 2 ? 'opacity-0 scale-95 blur-md' : ''}
      `}>
        <h1 className="text-7xl md:text-9xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white via-slate-100 to-slate-400 tracking-tighter uppercase italic drop-shadow-[0_20px_40px_rgba(0,0,0,1)] leading-none px-6">
          ULTRA <span className="text-transparent bg-clip-text bg-gradient-to-b from-rose-500 to-rose-800 drop-shadow-[0_0_20px_rgba(225,29,72,0.3)]">STUDIO</span>
        </h1>
        
        <div className={`h-[1px] bg-gradient-to-r from-transparent via-slate-600 to-transparent mt-6 mb-4 transition-all duration-[2000ms] delay-500 ease-out
          ${step >= 1 ? 'w-[80%] opacity-50' : 'w-0 opacity-0'}
        `}></div>
        
        <p className={`text-slate-400 text-[10px] md:text-xs font-medium tracking-[1em] uppercase pl-[1em] transition-all duration-[2000ms] delay-700 ease-out
          ${step >= 1 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}
        `}>
          Cinematic Engine
        </p>
      </div>
    </div>
  );
};

// --- 보안 인증 화면 ---
const AuthScreen = ({ onUnlock }) => {
  const [pwd, setPwd] = useState("");
  const [error, setError] = useState(false);
  const [success, setSuccess] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    if (inputRef.current) inputRef.current.focus();
  }, []);

  const handleChange = (e) => {
    if (success) return;
    const val = e.target.value.replace(/[^0-9]/g, '').slice(0, 4);
    setPwd(val);
    
    if (val === '1324') {
      setSuccess(true);
      setError(false);
      if (inputRef.current) {
        inputRef.current.blur();
      }
      setTimeout(onUnlock, 1500);
    } else if (val.length === 4) {
      setError(true);
      setTimeout(() => {
        setError(false);
        setPwd("");
      }, 800);
    }
  };

  return (
    <div className="fixed inset-0 z-40 flex flex-col items-center justify-center bg-[#050505] text-white animate-in fade-in duration-1000 select-none">
      <div className="absolute inset-0 opacity-10 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0IiBoZWlnaHQ9IjQiPgo8cmVjdCB3aWR0aD0iNCIgaGVpZ2h0PSI0IiBmaWxsPSIjZmZmIiBmaWxsLW9wYWNpdHk9IjAuMDUiLz4KPC9zdmc+')]"></div>
      
      <div className={`relative z-10 p-10 rounded-[2rem] border ${error ? 'border-rose-500 shadow-[0_0_40px_rgba(225,29,72,0.6)] animate-[shake_0.4s_ease-in-out]' : success ? 'border-cyan-400 shadow-[0_0_40px_rgba(34,211,238,0.5)]' : 'border-slate-800 shadow-2xl'} bg-black/60 backdrop-blur-xl flex flex-col items-center transition-all duration-300 min-w-[320px]`}>
        <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-6 transition-colors duration-500 ${success ? 'bg-cyan-900/40 text-cyan-400' : error ? 'bg-rose-900/40 text-rose-500' : 'bg-slate-800/50 text-slate-400'}`}>
          {success ? <Unlock size={32} /> : <Lock size={32} />}
        </div>
        
        <h2 className="text-2xl font-black uppercase tracking-[0.2em] mb-2 text-transparent bg-clip-text bg-gradient-to-r from-slate-100 to-slate-400 text-center">
          M78 Security
        </h2>
        <p className="text-[10px] text-slate-500 font-mono tracking-widest uppercase mb-10">Restricted Protocol Access</p>
        
        <input 
          ref={inputRef}
          type="password"
          value={pwd}
          onChange={handleChange}
          inputMode="numeric"
          className={`bg-transparent border-b-2 outline-none text-center text-4xl tracking-[0.5em] font-mono w-48 py-2 transition-colors duration-300 select-text
            ${success ? 'border-cyan-400 text-cyan-300' : error ? 'border-rose-500 text-rose-400' : 'border-slate-600 focus:border-cyan-500 text-white'}
          `}
          placeholder="••••"
        />
        
        <div className="mt-8 h-4">
          {error && <span className="text-rose-500 text-[10px] font-bold uppercase tracking-widest animate-pulse">Access Denied</span>}
          {success && <span className="text-cyan-400 text-[10px] font-bold uppercase tracking-widest animate-pulse">Access Granted</span>}
        </div>
      </div>
    </div>
  );
};

// --- 메인 앱 컴포넌트 ---
const App = () => {
  const [appState, setAppState] = useState('intro'); // intro, auth, home, main, collection, add-collection, create
  const [user, setUser] = useState(null);
  const [isCloudSyncing, setIsCloudSyncing] = useState(false);

  // --- 통합 로딩 상태 ---
  const [loadingState, setLoadingState] = useState(false);

  // --- Synthesis 모듈 상태 ---
  const [targets, setTargets] = useState([]); 
  const MAX_TARGETS = 10;
  const [resultImage, setResultImage] = useState(null);
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [history, setHistory] = useState([]); 
  const [error, setError] = useState(null);
  const [hasEdited, setHasEdited] = useState(false);
  const [prompt, setPrompt] = useState(defaultPrompt);
  const [isPresetsOpen, setIsPresetsOpen] = useState(false);
  const [presets, setPresets] = useState(defaultPresets);

  // --- Create 모듈 상태 ---
  const [createPrompt, setCreatePrompt] = useState("");
  const [createResultImage, setCreateResultImage] = useState(null);
  const [createHistory, setCreateHistory] = useState([]);
  const [createPresets, setCreatePresets] = useState(defaultCreatePresets);
  const [isCreatePresetsOpen, setIsCreatePresetsOpen] = useState(false);
  const [createLoadingState, setCreateLoadingState] = useState(false);
  const [createError, setCreateError] = useState(null);
  const [showCreatePresetModal, setShowCreatePresetModal] = useState(false);
  const [createPresetLabel, setCreatePresetLabel] = useState("");
  const [createPresetPrompt, setCreatePresetPrompt] = useState("");
  const [createEditingPresetId, setCreateEditingPresetId] = useState(null);
  const [createFilename, setCreateFilename] = useState("ultra_studio_create");
  const [isCreateSaving, setIsCreateSaving] = useState(false);
  const [showCreateDeleteConfirm, setShowCreateDeleteConfirm] = useState(false);
  const [createPresetToDelete, setCreatePresetToDelete] = useState(null);
  const [lastCreateAction, setLastCreateAction] = useState(null); // 'new' | 'continue'
  const [baseImageForContinue, setBaseImageForContinue] = useState(null);
  const createPresetsContainerRef = useRef(null);
  
  // -- Create 추가 기능 상태 --
  const [createAspectRatio, setCreateAspectRatio] = useState("1:1");
  const [createReferenceImage, setCreateReferenceImage] = useState(null);

  // --- Collection 모듈 상태 ---
  const [collections, setCollections] = useState([]);
  const [selectedCollection, setSelectedCollection] = useState(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [brands, setBrands] = useState(['BANDAI', 'GOOD SMILE', 'HASBRO', 'KOTOBUKIYA']);
  const [categories, setCategories] = useState(['ULTRAMAN', 'GUNDAM', 'TRANSFORMERS', 'MAZINGER']);
  
  // -- Collection 등록 폼 상태 --
  const [collectionForm, setCollectionForm] = useState({
    profileImages: [], // Max 4
    brand: '',
    category: '',
    series: '',
    name: '',
    creationDate: new Date().toISOString().split('T')[0],
    manualImages: [], // 배열로 변경 (Max 2)
    cardImageFront: null, // 앞뒷면 분리
    cardImageBack: null,
    sizeCm: '',
    ratingAppearance: 0,
    ratingDifficulty: 0,
    ratingArticulation: 0
  });
  const [isEditingCollection, setIsEditingCollection] = useState(false);
  const [activeCollectionId, setActiveCollectionId] = useState(null);
  
  // -- 필터 상태 --
  const [filterBrand, setFilterBrand] = useState('ALL');
  const [filterCategory, setFilterCategory] = useState('ALL');

  // -- 브랜드/카테고리 관리 모달 --
  const [manageType, setManageType] = useState(null); // 'brand' | 'category' | null
  const [manageInput, setManageInput] = useState("");

  const [showPresetModal, setShowPresetModal] = useState(false);
  const [editingPresetId, setEditingPresetId] = useState(null);
  const [newPresetLabel, setNewPresetLabel] = useState("");
  const [newPresetPrompt, setNewPresetPrompt] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [presetToDelete, setPresetToDelete] = useState(null);
  const [showInstallGuide, setShowInstallGuide] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [filename, setFilename] = useState("ultra_studio_synthesis");
  const [showToast, setShowToast] = useState(false);
  
  // --- Collection 상세 이미지 뷰어 전용 상태 ---
  const [detailViewerImage, setDetailViewerImage] = useState(null);
  const [isDetailViewerOpen, setIsDetailViewerOpen] = useState(false);

  const abortControllerRef = useRef(null);
  const createAbortControllerRef = useRef(null);
  const isCancelledRef = useRef(false);
  const isCreateCancelledRef = useRef(false);
  const presetsContainerRef = useRef(null);

  const apiKey = window.__gemini_api_key || "";

  // --- 클라우드 동기화 로직 ---
  useEffect(() => {
    if (!auth) return;
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (err) { console.error("Cloud Auth Error:", err); }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user || !db) return;
    setIsCloudSyncing(true);
    
    // 프리셋 동기화 (Synthesis)
    const presetDocRef = doc(db, 'artifacts', appId, 'users', user.uid, 'settings', 'presets');
    const unsubPresets = onSnapshot(presetDocRef, (docSnap) => {
      if (docSnap.exists() && docSnap.data().items) setPresets(docSnap.data().items);
      else setDoc(presetDocRef, { items: defaultPresets }).catch(console.error);
    });

    // 프리셋 동기화 (Create)
    const createPresetDocRef = doc(db, 'artifacts', appId, 'users', user.uid, 'settings', 'create_presets');
    const unsubCreatePresets = onSnapshot(createPresetDocRef, (docSnap) => {
      if (docSnap.exists() && docSnap.data().items) setCreatePresets(docSnap.data().items);
      else setDoc(createPresetDocRef, { items: defaultCreatePresets }).catch(console.error);
    });

    // 브랜드/카테고 동기화
    const settingsDocRef = doc(db, 'artifacts', appId, 'users', user.uid, 'settings', 'classification');
    const unsubSettings = onSnapshot(settingsDocRef, (docSnap) => {
      if (docSnap.exists()) {
        if (docSnap.data().brands) setBrands(docSnap.data().brands); // 수정된 부분: brands 속성을 정상적으로 할당
        if (docSnap.data().categories) setCategories(docSnap.data().categories);
      } else {
        setDoc(settingsDocRef, { brands, categories }).catch(console.error);
      }
    });

    // 콜렉션 목록 동기화
    const collRef = collection(db, 'artifacts', appId, 'users', user.uid, 'toy_collections');
    const unsubCollections = onSnapshot(collRef, (snapshot) => {
      const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setCollections(items);
      setIsCloudSyncing(false);
    }, (err) => {
      console.error("Collection Load Error:", err);
      setIsCloudSyncing(false);
    });

    return () => { unsubPresets(); unsubCreatePresets(); unsubSettings(); unsubCollections(); };
  }, [user]);

  const savePresetsToCloud = async (newPresets) => {
    setPresets(newPresets); 
    if (!user || !db) return;
    try {
      const presetDocRef = doc(db, 'artifacts', appId, 'users', user.uid, 'settings', 'presets');
      await setDoc(presetDocRef, { items: newPresets });
    } catch (e) { console.error("Cloud Save Failed:", e); }
  };

  const saveCreatePresetsToCloud = async (newPresets) => {
    setCreatePresets(newPresets); 
    if (!user || !db) return;
    try {
      const docRef = doc(db, 'artifacts', appId, 'users', user.uid, 'settings', 'create_presets');
      await setDoc(docRef, { items: newPresets });
    } catch (e) { console.error("Cloud Save Failed:", e); }
  };

  const saveClassificationToCloud = async (newBrands, newCats) => {
    if (!user || !db) return;
    try {
      const settingsDocRef = doc(db, 'artifacts', appId, 'users', user.uid, 'settings', 'classification');
      await setDoc(settingsDocRef, { brands: newBrands, categories: newCats });
    } catch (e) { console.error("Cloud Save Failed:", e); }
  };

  // --- Create 전용 핸들러 ---
  const handleCreateReferenceUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => setCreateReferenceImage(reader.result);
    reader.readAsDataURL(file);
    e.target.value = null; // 초기화
  };

  const handleCreatePresetClick = (presetPrompt) => {
    setCreatePrompt(presetPrompt); setIsCreatePresetsOpen(false);
  };

  const handleOpenAddCreatePresetModal = () => {
    setCreateEditingPresetId(null); setCreatePresetLabel(""); setCreatePresetPrompt(""); setShowCreatePresetModal(true);
  };

  const handleOpenEditCreatePresetModal = (e, preset) => {
    e.stopPropagation(); setCreateEditingPresetId(preset.id); setCreatePresetLabel(preset.label); setCreatePresetPrompt(preset.prompt); setShowCreatePresetModal(true);
  };

  const handleDeleteCreatePresetClick = (e, preset) => {
    e.stopPropagation(); setCreatePresetToDelete(preset); setShowCreateDeleteConfirm(true);
  };

  const confirmDeleteCreatePreset = () => {
    if (createPresetToDelete) {
      const newPresets = createPresets.filter(p => p.id !== createPresetToDelete.id);
      saveCreatePresetsToCloud(newPresets); setShowCreateDeleteConfirm(false); setCreatePresetToDelete(null);
    }
  };

  const handleSaveCreatePreset = () => {
    if (!createPresetLabel.trim() || !createPresetPrompt.trim()) return;
    let newPresets;
    if (createEditingPresetId) {
      newPresets = createPresets.map(p => p.id === createEditingPresetId ? { ...p, label: createPresetLabel.trim(), prompt: createPresetPrompt.trim() } : p);
    } else {
      newPresets = [...createPresets, { id: `c-custom-${Date.now()}`, label: createPresetLabel.trim(), prompt: createPresetPrompt.trim() }];
    }
    saveCreatePresetsToCloud(newPresets); setShowCreatePresetModal(false);
  };

  const toggleCreatePresetsMenu = () => {
    const willOpen = !isCreatePresetsOpen;
    setIsCreatePresetsOpen(willOpen);
    if (willOpen) {
      setTimeout(() => {
        if (createPresetsContainerRef.current) {
          const y = createPresetsContainerRef.current.getBoundingClientRect().top + window.scrollY - 24;
          window.scrollTo({ top: y, behavior: 'smooth' });
        }
      }, 150);
    }
  };

  const handleCreateDownload = () => {
    if (!createResultImage) return;
    const link = document.createElement('a');
    link.href = createResultImage;
    link.download = `${createFilename || 'ultra_studio_create'}.png`;
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
    setIsCreateSaving(false); setShowToast(true); setTimeout(() => setShowToast(false), 3000);
  };

  const handleCreateNewImage = async () => {
    if (!createPrompt.trim()) return;
    isCreateCancelledRef.current = false;
    if (createAbortControllerRef.current) createAbortControllerRef.current.abort();
    createAbortControllerRef.current = new AbortController();
    setCreateLoadingState(true); setCreateError(null); setIsCreatePresetsOpen(false); setIsCreateSaving(false); 
    
    // 동작 기억
    setLastCreateAction('new');
    setBaseImageForContinue(null);
    // 3. GENERATE 누르면 이전 히스토리 및 현재 결과 완전 초기화
    setCreateHistory([]);
    setCreateResultImage(null);

    // 4. 고퀄리티 & 프롬프트 이해도 향상을 위한 프롬프트 엔지니어링 랩핑
    const enhancedPrompt = `${createPrompt}. Masterpiece, best quality, highly detailed, photorealistic, 8k resolution. Aspect ratio: ${createAspectRatio}`;

    try {
      if (createReferenceImage) {
        // 참고 이미지가 있을 경우, 제미나이 2.5 플래시 이미지 모델을 통한 대화형 생성(이미지 투 이미지)
        const b64 = createReferenceImage.split(',')[1];
        const systemPrompt = "You are an expert AI image assistant. Engage in a creative dialogue. Using the provided reference image, fulfill the user's request flawlessly. Ensure the result is a highly detailed masterpiece.";
        
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: `${systemPrompt}\nUser Request: ${enhancedPrompt}` }, { inlineData: { mimeType: "image/png", data: b64 } }] }],
            generationConfig: { responseModalities: ["TEXT", "IMAGE"] }
          }),
          signal: createAbortControllerRef.current.signal
        });
        if (isCreateCancelledRef.current) throw new DOMException('Aborted', 'AbortError');
        if (!response.ok) throw new Error("Image Generation Failed");
        const result = await response.json();
        const generatedBase64 = result.candidates?.[0]?.content?.parts?.find(p => p.inlineData)?.inlineData?.data;
        if (generatedBase64) {
          const newImg = `data:image/png;base64,${generatedBase64}`;
          setCreateResultImage(newImg);
          setCreateHistory(prev => [newImg, ...prev]);
        } else {
          throw new Error("No image data");
        }
      } else {
        // 참고 이미지가 없을 경우 기본 Imagen 4 생성 모델 사용 (비율 파라미터 적용)
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/imagen-4.0-generate-001:predict?key=${apiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            instances: { prompt: enhancedPrompt }, 
            parameters: { sampleCount: 1, aspectRatio: createAspectRatio } 
          }),
          signal: createAbortControllerRef.current.signal
        });
        if (isCreateCancelledRef.current) throw new DOMException('Aborted', 'AbortError');
        if (!response.ok) throw new Error("Image Generation Failed");
        const result = await response.json();
        const b64 = result.predictions?.[0]?.bytesBase64Encoded;
        if (b64) {
          const newImg = `data:image/png;base64,${b64}`;
          setCreateResultImage(newImg);
          setCreateHistory(prev => [newImg, ...prev]);
        } else {
          throw new Error("No image data");
        }
      }
    } catch (err) {
      if (err.name !== 'AbortError' && !isCreateCancelledRef.current) { setCreateError("이미지 생성에 실패했습니다. 프롬프트를 확인하고 다시 시도해주세요."); }
    } finally {
      if (!isCreateCancelledRef.current) setCreateLoadingState(false);
      createAbortControllerRef.current = null;
    }
  };

  const handleCreateContinueImage = async (overrideBaseImage = null) => {
    const baseImg = overrideBaseImage || createResultImage;
    if (!createPrompt.trim() || !baseImg) return;
    
    isCreateCancelledRef.current = false;
    if (createAbortControllerRef.current) createAbortControllerRef.current.abort();
    createAbortControllerRef.current = new AbortController();
    setCreateLoadingState(true); setCreateError(null); setIsCreatePresetsOpen(false); setIsCreateSaving(false); 
    
    // 동작 기억 (overrideBaseImage가 없다는 것은 버튼을 직접 눌렀다는 의미, 있으면 Remake로 들어온 것)
    if (!overrideBaseImage) {
      setLastCreateAction('continue');
      setBaseImageForContinue(baseImg);
    }

    // 5. 제미나이와 대화하듯이 이어만들기 위한 시스템 프롬프트 부여
    const chatPrompt = `You are a creative AI design partner in a conversational workflow. I provided our current image. Apply my new instruction perfectly while maintaining masterpiece quality. \nMy Instruction: "${createPrompt}"`;

    try {
      const b64 = baseImg.split(',')[1];
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image-preview:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: chatPrompt }, { inlineData: { mimeType: "image/png", data: b64 } }] }],
          generationConfig: { responseModalities: ["TEXT", "IMAGE"] }
        }),
        signal: createAbortControllerRef.current.signal
      });
      if (isCreateCancelledRef.current) throw new DOMException('Aborted', 'AbortError');
      if (!response.ok) throw new Error("Image Edit Failed");
      const result = await response.json();
      const generatedBase64 = result.candidates?.[0]?.content?.parts?.find(p => p.inlineData)?.inlineData?.data;
      if (generatedBase64) {
        const newImg = `data:image/png;base64,${generatedBase64}`;
        setCreateResultImage(newImg);
        setCreateHistory(prev => [newImg, ...prev]);
      } else {
        throw new Error("No image data");
      }
    } catch (err) {
      if (err.name !== 'AbortError' && !isCreateCancelledRef.current) { setCreateError("이어 만들기에 실패했습니다. 다시 시도해주세요."); }
    } finally {
      if (!isCreateCancelledRef.current) setCreateLoadingState(false);
      createAbortControllerRef.current = null;
    }
  };

  const handleCreateRemakeImage = async () => {
    if (!createPrompt.trim() || !lastCreateAction) return;
    if (lastCreateAction === 'continue' && baseImageForContinue) {
      await handleCreateContinueImage(baseImageForContinue);
    } else {
      await handleCreateNewImage();
    }
  };


  // --- Synthesis 전용 핸들러 ---
  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;
    if (targets.length + files.length > MAX_TARGETS) {
      setError(`최대 ${MAX_TARGETS}개의 이미지만 등록할 수 있습니다.`);
      return;
    }
    const newTargetsPromises = files.map(file => {
      return new Promise((resolve) => {
        if (file.size > 10 * 1024 * 1024) { resolve(null); return; }
        const reader = new FileReader();
        reader.onloadend = () => {
          resolve({ id: Math.random().toString(36).substr(2, 9), url: reader.result, base64: reader.result.split(',')[1] });
        };
        reader.readAsDataURL(file);
      });
    });
    Promise.all(newTargetsPromises).then(results => {
      const validTargets = results.filter(r => r !== null);
      setTargets(prev => [...prev, ...validTargets]);
      setResultImage(null);
      setHistory([]);
      setHasEdited(false);
      e.target.value = null; 
    });
  };

  const removeTarget = (indexToRemove) => {
    if (loadingState) return;
    setTargets(prev => prev.filter((_, idx) => idx !== indexToRemove));
    setResultImage(null); setHistory([]); setHasEdited(false);
  };

  const clearAllTargets = () => {
    if (loadingState) return;
    setTargets([]); setResultImage(null); setHistory([]); setHasEdited(false);
  };

  const cancelableSleep = (ms, signal) => new Promise((resolve, reject) => {
    const timeout = setTimeout(resolve, ms);
    if (signal) {
      signal.addEventListener('abort', () => { clearTimeout(timeout); reject(new DOMException('Aborted', 'AbortError')); }, { once: true });
    }
  });

  const editImageWithRetry = async (currentPrompt, retryCount = 0) => {
    try {
      if (isCancelledRef.current) throw new DOMException('Aborted', 'AbortError');
      const imageParts = targets.map(t => ({ inlineData: { mimeType: "image/png", data: t.base64 } }));
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image-preview:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: currentPrompt }, ...imageParts] }],
            generationConfig: { responseModalities: ["TEXT", "IMAGE"] }
          }),
          signal: abortControllerRef.current?.signal 
        }
      );
      if (isCancelledRef.current) throw new DOMException('Aborted', 'AbortError');
      if (!response.ok) throw new Error(`Status: ${response.status}`);
      const result = await response.json();
      const generatedBase64 = result.candidates?.[0]?.content?.parts?.find(p => p.inlineData)?.inlineData?.data;
      if (generatedBase64) {
        const newImg = `data:image/png;base64,${generatedBase64}`;
        setResultImage(newImg);
        setHistory(prev => [newImg, ...prev]); 
        setHasEdited(true);
      } else { throw new Error("Image Generation Failed"); }
    } catch (err) {
      if (err.name === 'AbortError' || isCancelledRef.current) throw new DOMException('Aborted', 'AbortError');
      if (retryCount < 5) {
        const delay = Math.pow(2, retryCount) * 1000;
        await cancelableSleep(delay, abortControllerRef.current?.signal);
        return editImageWithRetry(currentPrompt, retryCount + 1);
      }
      throw err;
    }
  };

  const handleStartEditing = async (overridePrompt = null) => {
    if (targets.length === 0) return;
    isCancelledRef.current = false;
    if (abortControllerRef.current) abortControllerRef.current.abort();
    abortControllerRef.current = new AbortController();
    setLoadingState(true); setError(null); setIsPresetsOpen(false); setIsSaving(false); 
    const finalPrompt = overridePrompt || prompt;
    try { await editImageWithRetry(finalPrompt); } catch (err) {
      if (err.name !== 'AbortError' && !isCancelledRef.current) { setError("합성에 실패했습니다. 다시 시도해 주세요."); }
    } finally {
      if (!isCancelledRef.current) setLoadingState(false);
      abortControllerRef.current = null;
    }
  };

  const handleCancelSynthesis = () => {
    isCancelledRef.current = true;
    if (abortControllerRef.current) abortControllerRef.current.abort();
    setLoadingState(false);
  };

  const handlePresetClick = (presetPrompt) => {
    setPrompt(presetPrompt); setIsPresetsOpen(false);
    if (targets.length > 0 && !loadingState) handleStartEditing(presetPrompt);
  };

  const handleOpenAddPresetModal = () => {
    setEditingPresetId(null); setNewPresetLabel(""); setNewPresetPrompt(""); setShowPresetModal(true);
  };

  const handleOpenEditPresetModal = (e, preset) => {
    e.stopPropagation(); setEditingPresetId(preset.id); setNewPresetLabel(preset.label); setNewPresetPrompt(preset.prompt); setShowPresetModal(true);
  };

  const handleDeletePresetClick = (e, preset) => {
    e.stopPropagation(); setPresetToDelete(preset); setShowDeleteConfirm(true);
  };

  const confirmDeletePreset = () => {
    if (presetToDelete) {
      const newPresets = presets.filter(p => p.id !== presetToDelete.id);
      savePresetsToCloud(newPresets); setShowDeleteConfirm(false); setPresetToDelete(null);
    }
  };

  const handleSavePreset = () => {
    if (!newPresetLabel.trim() || !newPresetPrompt.trim()) return;
    let newPresets;
    if (editingPresetId) {
      newPresets = presets.map(p => p.id === editingPresetId ? { ...p, label: newPresetLabel.trim(), prompt: newPresetPrompt.trim() } : p);
    } else {
      newPresets = [...presets, { id: `custom-${Date.now()}`, label: newPresetLabel.trim(), prompt: newPresetPrompt.trim() }];
    }
    savePresetsToCloud(newPresets); setShowPresetModal(false);
  };

  const handleDownload = () => {
    if (!resultImage) return;
    const link = document.createElement('a');
    link.href = resultImage;
    link.download = `${filename || 'ultra_studio'}.png`;
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
    setIsSaving(false); setShowToast(true); setTimeout(() => setShowToast(false), 3000);
  };

  const togglePresetsMenu = () => {
    const willOpen = !isPresetsOpen;
    setIsPresetsOpen(willOpen);
    if (willOpen) {
      setTimeout(() => {
        if (presetsContainerRef.current) {
          const y = presetsContainerRef.current.getBoundingClientRect().top + window.scrollY - 24;
          window.scrollTo({ top: y, behavior: 'smooth' });
        }
      }, 150);
    }
  };

  // --- Specium Collection 전용 핸들러 (최적화 적용) ---
  const handleCollectionImageUpload = (type, index = null) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    if (type === 'manual') input.multiple = true; // 매뉴얼은 다중 업로드 허용

    input.onchange = async (e) => {
      const files = Array.from(e.target.files);
      if (files.length === 0) return;
      
      if (type === 'manual') {
        const currentCount = collectionForm.manualImages.length;
        const availableSlots = 2 - currentCount;
        const filesToProcess = files.slice(0, availableSlots);
        
        if (files.length > availableSlots) {
           alert(`설명서는 최대 2장까지만 업로드 가능합니다. (현재 ${currentCount}장)`);
        }

        const newImagesPromises = filesToProcess.map(file => {
          return new Promise(resolve => {
            const reader = new FileReader();
            reader.onloadend = async () => {
              // 화질 원상복구를 위해 기본 압축(1000x1000, 0.7) 설정 사용
              const compressed = await compressImage(reader.result);
              resolve(compressed);
            }
            reader.readAsDataURL(file);
          });
        });
        
        const newImages = await Promise.all(newImagesPromises);
        setCollectionForm(prev => ({ ...prev, manualImages: [...prev.manualImages, ...newImages] }));

      } else {
        // 단일 파일 처리들
        const file = files[0];
        const reader = new FileReader();
        reader.onloadend = async () => {
          // 화질 원상복구를 위해 기본 압축(1000x1000, 0.7) 설정 사용
          const compressed = await compressImage(reader.result);
          
          if (type === 'profile') {
            const newImages = [...collectionForm.profileImages];
            if (index !== null) newImages[index] = compressed;
            else if (newImages.length < 4) newImages.push(compressed);
            setCollectionForm({ ...collectionForm, profileImages: newImages });
          } else if (type === 'cardFront') {
            setCollectionForm({ ...collectionForm, cardImageFront: compressed });
          } else if (type === 'cardBack') {
            setCollectionForm({ ...collectionForm, cardImageBack: compressed });
          }
        };
        reader.readAsDataURL(file);
      }
    };
    input.click();
  };

  const handleSaveCollection = async () => {
    if (!collectionForm.name.trim()) return;
    if (!user || !db) return;
    setLoadingState(true);
    setError(null);
    try {
      const collRef = collection(db, 'artifacts', appId, 'users', user.uid, 'toy_collections');
      if (isEditingCollection && activeCollectionId) {
        await updateDoc(doc(collRef, activeCollectionId), collectionForm);
      } else {
        await addDoc(collRef, collectionForm);
      }
      resetCollectionForm();
      setAppState('collection');
    } catch (e) {
      console.error("Collection Save Error:", e);
      if (e.message && e.message.includes("exceeds the maximum allowed size")) {
        setError("데이터 용량이 너무 큽니다 (Firestore 1MB 초과). 첨부된 이미지 개수를 줄이거나 다시 시도해주세요.");
      } else {
        setError("저장 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.");
      }
    } finally {
      setLoadingState(false);
    }
  };

  const handleDeleteCollection = async (e, id) => {
    e.stopPropagation();
    if (!user || !db) return;
    if (window.confirm("정말로 이 완구 데이터를 삭제하시겠습니까?")) {
      try {
        await deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'toy_collections', id));
      } catch (e) { console.error(e); }
    }
  };

  const handleEditCollectionStart = (e, item) => {
    e.stopPropagation();
    
    // 마이그레이션 처리 (구버전 데이터 호환성 유지)
    const migratedItem = { ...item };
    if (!migratedItem.manualImages) migratedItem.manualImages = item.manualImage ? [item.manualImage] : [];
    if (!migratedItem.cardImageFront) migratedItem.cardImageFront = item.cardImage || null;
    if (!migratedItem.cardImageBack) migratedItem.cardImageBack = null;

    setCollectionForm(migratedItem);
    setIsEditingCollection(true);
    setActiveCollectionId(item.id);
    setError(null); // 에러 상태 초기화
    setAppState('add-collection');
  };

  const resetCollectionForm = () => {
    setCollectionForm({
      profileImages: [],
      brand: '',
      category: '',
      series: '',
      name: '',
      creationDate: new Date().toISOString().split('T')[0],
      manualImages: [],
      cardImageFront: null,
      cardImageBack: null,
      sizeCm: '',
      ratingAppearance: 0,
      ratingDifficulty: 0,
      ratingArticulation: 0
    });
    setIsEditingCollection(false);
    setActiveCollectionId(null);
    setError(null); // 에러 상태 초기화
  };

  const handleManageSubmit = () => {
    if (!manageInput.trim()) return;
    let nextBrands = [...brands];
    let nextCats = [...categories];
    if (manageType === 'brand') {
      if (!brands.includes(manageInput.trim())) nextBrands.push(manageInput.trim());
    } else {
      if (!categories.includes(manageInput.trim())) nextCats.push(manageInput.trim());
    }
    setBrands(nextBrands);
    setCategories(nextCats);
    saveClassificationToCloud(nextBrands, nextCats);
    setManageInput("");
    // setManageType(null); // 강제로 닫지 않고 추가 내역을 바로 확인할 수 있도록 유지
  };

  const handleManageDelete = (type, value) => {
    let nextBrands = brands.filter(b => b !== value);
    let nextCats = categories.filter(c => c !== value);
    if (type === 'brand') setBrands(nextBrands);
    else setCategories(nextCats);
    saveClassificationToCloud(nextBrands, nextCats);
  };

  // 필터링 적용된 콜렉션 목록
  const filteredCollections = collections.filter(item => {
    const matchBrand = filterBrand === 'ALL' || item.brand === filterBrand;
    const matchCategory = filterCategory === 'ALL' || item.category === filterCategory;
    return matchBrand && matchCategory;
  });

  // --- 홈 화면 UI ---
  const renderHomeScreen = () => (
    <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-1000">
      <div className="max-w-xl mx-auto w-full flex flex-col gap-6">
        {/* Synthesis 모듈 */}
        <div 
          onClick={() => { setError(null); setAppState('main'); }}
          className="group relative h-[150px] rounded-[2.5rem] border border-slate-800 bg-slate-900/50 hover:bg-slate-900 overflow-hidden cursor-pointer transition-all duration-500 hover:border-rose-600/50 hover:shadow-[0_0_40px_rgba(225,29,72,0.15)] flex items-center"
        >
          <div className="absolute inset-0 z-0 overflow-hidden">
             <img 
               src="VjivC7NR0iK0xC4F7B1DYVAFOLGHpb2cjVIioKhQoj65klpTXUZQULdEmHpxfgjg0HcGa1z4CAAgnGcqT1bTTQ.jpg" 
               className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
               alt="Ultraman Background"
               onError={(e) => { e.target.style.display = 'none'; }}
             />
          </div>
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/20 to-transparent z-10"></div>
          <div className="relative z-20 w-full px-8 flex items-center justify-between gap-6">
             <div className="flex items-center gap-5">
                <div className="w-14 h-14 rounded-2xl bg-rose-600 flex items-center justify-center shadow-[0_0_25px_rgba(225,29,72,0.5)] group-hover:scale-110 group-hover:rotate-[360deg] transition-all duration-700 shrink-0 border border-rose-400/30">
                    <Sparkles size={28} className="text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.5)]" />
                </div>
                <div className="flex flex-col justify-center">
                  <h3 className="text-2xl font-black text-white italic uppercase tracking-tighter drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] leading-none mb-1.5 whitespace-nowrap">Synthesis</h3>
                  <p className="text-slate-200 text-[11px] font-bold uppercase tracking-[0.15em] drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)] opacity-90 whitespace-nowrap">배경 합성 및 퀀텀 렌더링</p>
                </div>
             </div>
             <div className="bg-rose-600/20 backdrop-blur-md border border-rose-500/30 px-4 py-2 rounded-full text-rose-500 font-black text-[10px] uppercase tracking-[0.3em] opacity-0 group-hover:opacity-100 translate-x-4 group-hover:translate-x-0 transition-all duration-500 flex items-center gap-2 shrink-0">
                START <ArrowRight size={14} />
             </div>
          </div>
        </div>

        {/* Collection 모듈 */}
        <div 
          onClick={() => { setError(null); setAppState('collection'); setFilterBrand('ALL'); setFilterCategory('ALL'); }}
          className="group relative h-[150px] rounded-[2.5rem] border border-slate-800 bg-slate-900/50 hover:bg-slate-900 overflow-hidden cursor-pointer transition-all duration-500 hover:border-cyan-600/50 hover:shadow-[0_0_40px_rgba(8,145,178,0.15)] flex items-center"
        >
          <div className="absolute inset-0 z-0 overflow-hidden">
             <img 
               src="https://images.unsplash.com/photo-1566576721346-d4a3b4eaad5b?auto=format&fit=crop&q=80&w=1200" 
               className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 opacity-40 grayscale" 
               alt="Collection Background"
               onError={(e) => { e.target.style.display = 'none'; }}
             />
          </div>
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/40 to-transparent z-10"></div>
          <div className="relative z-20 w-full px-8 flex items-center justify-between gap-6">
             <div className="flex items-center gap-5">
                <div className="w-14 h-14 rounded-2xl bg-cyan-600 flex items-center justify-center shadow-[0_0_25px_rgba(8,145,178,0.5)] group-hover:scale-110 group-hover:rotate-[360deg] transition-all duration-700 shrink-0 border border-cyan-400/30">
                    <Box size={28} className="text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.5)]" />
                </div>
                <div className="flex flex-col justify-center">
                  <h3 className="text-2xl font-black text-white italic uppercase tracking-tighter drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] leading-none mb-1.5 whitespace-nowrap">Collection</h3>
                  <p className="text-slate-200 text-[11px] font-bold uppercase tracking-[0.15em] drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)] opacity-90 whitespace-nowrap">수집한 완구 기록 및 도감</p>
                </div>
             </div>
             <div className="bg-cyan-600/20 backdrop-blur-md border border-cyan-500/30 px-4 py-2 rounded-full text-cyan-400 font-black text-[10px] uppercase tracking-[0.3em] opacity-0 group-hover:opacity-100 translate-x-4 group-hover:translate-x-0 transition-all duration-500 flex items-center gap-2 shrink-0">
                EXPLORE <ArrowRight size={14} />
             </div>
          </div>
        </div>

        {/* CREATE 모듈 */}
        <div 
          onClick={() => { setCreateError(null); setAppState('create'); }}
          className="group relative h-[150px] rounded-[2.5rem] border border-slate-800 bg-slate-900/50 hover:bg-slate-900 overflow-hidden cursor-pointer transition-all duration-500 hover:border-purple-600/50 hover:shadow-[0_0_40px_rgba(168,85,247,0.15)] flex items-center"
        >
          <div className="absolute inset-0 z-0 overflow-hidden">
             <img 
               src="https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=80&w=1200" 
               className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 opacity-40 grayscale mix-blend-screen" 
               alt="Create Background"
               onError={(e) => { e.target.style.display = 'none'; }}
             />
          </div>
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/40 to-transparent z-10"></div>
          <div className="relative z-20 w-full px-8 flex items-center justify-between gap-6">
             <div className="flex items-center gap-5">
                <div className="w-14 h-14 rounded-2xl bg-purple-600 flex items-center justify-center shadow-[0_0_25px_rgba(168,85,247,0.5)] group-hover:scale-110 group-hover:rotate-[360deg] transition-all duration-700 shrink-0 border border-purple-400/30">
                    <ImagePlus size={28} className="text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.5)]" />
                </div>
                <div className="flex flex-col justify-center">
                  <h3 className="text-2xl font-black text-white italic uppercase tracking-tighter drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] leading-none mb-1.5 whitespace-nowrap">Create</h3>
                  <p className="text-slate-200 text-[11px] font-bold uppercase tracking-[0.15em] drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)] opacity-90 whitespace-nowrap">상상을 현실로 만드는 창작 도구</p>
                </div>
             </div>
             <div className="bg-purple-600/20 backdrop-blur-md border border-purple-500/30 px-4 py-2 rounded-full text-purple-400 font-black text-[10px] uppercase tracking-[0.3em] opacity-0 group-hover:opacity-100 translate-x-4 group-hover:translate-x-0 transition-all duration-500 flex items-center gap-2 shrink-0">
                START <ArrowRight size={14} />
             </div>
          </div>
        </div>

      </div>
    </div>
  );

  if (appState === 'intro') return <IntroSequence onComplete={() => setAppState('auth')} />;
  if (appState === 'auth') return <AuthScreen onUnlock={() => setAppState('home')} />;

  // --- 메인 렌더링 영역 ---
  return (
    <div className="min-h-screen bg-[#020617] text-white p-4 md:p-8 font-sans selection:bg-rose-500 selection:text-white animate-in fade-in duration-1000 select-none">
      <div className="fixed inset-0 overflow-hidden pointer-events-none opacity-25 z-0">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-rose-600 rounded-full blur-[140px] opacity-40"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-cyan-600 rounded-full blur-[120px] opacity-30"></div>
        {appState === 'create' && (
           <div className="absolute top-[20%] right-[-10%] w-[40%] h-[40%] bg-purple-600 rounded-full blur-[150px] opacity-30"></div>
        )}
      </div>

      <div className="max-w-4xl mx-auto relative z-10 pt-4 md:pt-8">
        <header className="mb-10 flex flex-col items-center">
          <div className="w-full flex justify-between items-start mb-4">
             <div className="flex-1">
                {(appState !== 'home') && (
                  <button 
                    onClick={() => {
                      if (appState === 'add-collection') setAppState('collection');
                      else setAppState('home');
                    }}
                    className="w-10 h-10 flex items-center justify-center bg-slate-800/80 hover:bg-slate-700 text-slate-300 rounded-full border border-slate-700 transition-all hover:scale-110 active:scale-90 shadow-lg group"
                  >
                    <Home size={20} className="group-hover:text-rose-500 transition-colors" />
                  </button>
                )}
             </div>
             <div className="inline-flex items-center gap-2 px-4 py-1 bg-rose-600/20 border border-rose-600/50 text-rose-400 text-[10px] md:text-xs font-bold tracking-widest uppercase rounded-full shadow-[0_0_15px_rgba(225,29,72,0.2)] backdrop-blur-sm">
                <Shield size={14} /> M78 Nebula Spec-Ops
             </div>
             <div className="flex-1 flex justify-end">
                <button onClick={() => setShowInstallGuide(true)} className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-full border border-slate-700 transition-all hover:scale-110 active:scale-90 shadow-lg">
                  <Smartphone size={18} />
                </button>
             </div>
          </div>

          <h1 className="text-5xl md:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-slate-400 mb-6 tracking-tighter uppercase italic drop-shadow-2xl text-center">
            {appState === 'collection' || appState === 'add-collection' ? (
              <>SPECIUM <span className="text-cyan-500">COLLECTION</span></>
            ) : appState === 'create' ? (
              <>CREATE <span className="text-purple-500">STUDIO</span></>
            ) : (
              <>ULTRA <span className="text-rose-600">STUDIO</span></>
            )}
          </h1>
          
          <div className="max-w-2xl mx-auto px-4 flex flex-col items-center gap-2 text-center">
            <p className="text-slate-300 text-sm md:text-lg font-medium leading-relaxed break-keep">
              {appState === 'collection' || appState === 'add-collection' ? (
                <>수집한 완구의 정보를 <span className="text-cyan-400 font-bold">도감 형식으로 영구 기록합니다.</span></>
              ) : appState === 'create' ? (
                <>프롬프트를 통해 상상하는 모든 이미지를 <span className="text-purple-400 font-bold">자유롭게 구체화합니다.</span></>
              ) : (
                <>과학특수대의 기술력을 집약하여 <span className="text-white font-bold">피규어 배경을 완벽하게 합성합니다.</span></>
              )}
            </p>
            {user && (
              <div className="flex items-center gap-1.5 text-[10px] text-cyan-400 bg-cyan-900/30 px-3 py-1 rounded-full border border-cyan-500/30">
                {isCloudSyncing ? <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" /> : <Cloud size={12} />}
                <span className="font-mono tracking-widest uppercase">{isCloudSyncing ? 'Cloud Syncing...' : 'Cloud Synced'}</span>
              </div>
            )}
          </div>
        </header>

        {/* --- 애플리케이션 상태별 화면 --- */}
        {appState === 'home' ? renderHomeScreen() : appState === 'main' ? (
          /* --- 기존 SYNTHESIS 모듈 화면 --- */
          <div className="animate-in fade-in slide-in-from-bottom-6 duration-700">
            {error && (
              <div className="max-w-4xl mx-auto mb-6 bg-rose-500/10 border border-rose-500/50 rounded-2xl p-4 flex items-center gap-3 text-rose-400 animate-in fade-in slide-in-from-top-4">
                <AlertCircle size={20} className="shrink-0" />
                <p className="text-sm font-medium">{error}</p>
              </div>
            )}

            <div className="flex flex-col gap-6 mb-12 relative z-20">
              <div className="bg-slate-900/80 backdrop-blur-sm border border-slate-800 rounded-3xl p-6 flex flex-col shadow-2xl group relative overflow-hidden">
                <div className="flex items-center justify-between mb-4 shrink-0 overflow-hidden">
                  <div className="flex flex-col gap-1 border-l-4 border-rose-600 pl-3 min-w-0">
                    <div className="flex items-center gap-2">
                      <Target className="text-rose-600 shrink-0" size={20} />
                      <h3 className="text-lg font-bold uppercase tracking-tighter italic text-slate-200 truncate">1. Target Scan</h3>
                    </div>
                    <div className="text-[10px] font-mono text-slate-500 tracking-widest pl-7 mt-0.5 whitespace-nowrap">
                      LOCKED: <span className={targets.length > 0 ? (targets.length >= MAX_TARGETS ? "text-cyan-400" : "text-rose-400") : ""}>{targets.length}</span> / {MAX_TARGETS}
                    </div>
                  </div>
                  {targets.length > 0 && (
                    <button onClick={clearAllTargets} disabled={loadingState} className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-rose-950/30 border border-rose-500/30 text-rose-400 hover:bg-rose-500 hover:text-white transition-all duration-300 group/clear shadow-sm hover:shadow-rose-500/20 disabled:opacity-50">
                      <Trash2 size={12} className="group-hover/clear:rotate-12 transition-transform" />
                      <span className="text-[9px] font-black uppercase tracking-[0.1em] hidden sm:inline">Reset</span>
                    </button>
                  )}
                </div>

                {targets.length === 0 ? (
                  <label className="min-h-[220px] flex flex-col items-center justify-center cursor-pointer border-2 border-dashed border-slate-700/50 rounded-2xl hover:border-rose-500/50 hover:bg-rose-500/5 transition-all duration-300">
                    <div className="w-16 h-16 bg-slate-800/50 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-lg border border-slate-700">
                      <Upload className="w-6 h-6 text-rose-500" />
                    </div>
                    <span className="text-slate-300 font-bold tracking-widest text-sm text-center px-4 break-keep">피규어 사진 업로드 (최대 {MAX_TARGETS}장)</span>
                    <p className="text-slate-500 text-[10px] mt-2 font-mono uppercase tracking-widest">Specimen Data Input</p>
                    <input type="file" multiple className="hidden" accept="image/*" onChange={handleImageUpload} />
                  </label>
                ) : (
                  <div className="relative bg-black/60 rounded-2xl border border-slate-800 shadow-inner p-4 flex flex-col overflow-hidden">
                    {loadingState && (
                      <div className="absolute inset-0 z-20 pointer-events-none bg-slate-900/40 backdrop-blur-[1px] rounded-2xl transition-all duration-500 overflow-hidden">
                        <div className="absolute inset-0 bg-[linear-gradient(to_right,#0891b211_1px,transparent_1px),linear-gradient(to_bottom,#0891b211_1px,transparent_1px)] bg-[size:30px_30px]"></div>
                        <div className="absolute inset-0 z-30 pointer-events-none">
                          {[...Array(3)].map((_, i) => (
                            <div key={i} className="absolute border border-cyan-400/40 rounded shadow-[0_0_15px_rgba(34,211,238,0.3)] animate-[indexing_3s_ease-in-out_infinite]" style={{ animationDelay: `${i * 0.8}s` }}>
                               <div className="absolute -top-4 -left-1 text-[6px] font-mono text-cyan-400 bg-black/80 px-1">ID: {Math.random().toString(16).slice(2, 8).toUpperCase()}</div>
                            </div>
                          ))}
                        </div>
                        <div className="absolute left-2 top-0 bottom-0 w-24 border-r border-cyan-500/10 flex flex-col gap-1 p-2 overflow-hidden opacity-50">
                           {[...Array(20)].map((_, i) => (
                             <div key={i} className="h-1 bg-cyan-500/20" style={{ width: `${Math.random() * 100}%` }}></div>
                           ))}
                        </div>
                        <div className="absolute left-0 right-0 h-[2px] bg-cyan-300 shadow-[0_0_25px_rgba(34,211,238,1)] z-40 animate-[scan_v2_2s_ease-in-out_infinite]"></div>
                        <div className="absolute inset-0 pointer-events-none opacity-20 bg-[radial-gradient(ellipse_at_center,transparent_0%,#000_100%)]"></div>
                      </div>
                    )}
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar relative z-10">
                      {targets.map((target, idx) => (
                        <div key={target.id} className="relative rounded-xl border border-slate-700 overflow-hidden group bg-slate-900 flex items-center justify-center aspect-square shadow-lg">
                          <img src={target.url} alt={`Target ${idx+1}`} className={`max-h-full max-w-full object-contain p-2 transition-all duration-700 ${loadingState ? 'opacity-30 grayscale scale-90 blur-[2px]' : 'group-hover:scale-105'}`} />
                          {!loadingState && (
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={() => removeTarget(idx)} className="absolute top-1.5 right-1.5 w-6 h-6 bg-rose-600/90 hover:bg-rose-500 text-white rounded-full flex items-center justify-center shadow-lg transition-transform hover:scale-110">
                                <X size={12} />
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                      {targets.length < MAX_TARGETS && (
                        <label className={`relative rounded-xl border-2 border-dashed border-slate-700 flex flex-col items-center justify-center cursor-pointer hover:border-rose-500/50 hover:bg-rose-500/5 transition-all aspect-square group/add ${loadingState ? 'opacity-30 pointer-events-none' : ''}`}>
                          <Plus className="text-slate-500 group-hover/add:text-rose-400" size={20} />
                          <input type="file" multiple className="hidden" accept="image/*" onChange={handleImageUpload} disabled={loadingState} />
                        </label>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="bg-slate-900/80 backdrop-blur-sm border border-slate-700/80 rounded-3xl p-6 shadow-2xl relative z-30" ref={presetsContainerRef}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 border-l-4 border-purple-500 pl-3 relative z-50">
                  <div className="flex items-center gap-2">
                    <Terminal className="text-purple-400" size={20} />
                    <h3 className="text-lg font-bold uppercase tracking-tighter italic text-slate-200">2. Command Directive</h3>
                  </div>
                  <button onClick={togglePresetsMenu} disabled={loadingState} className={`flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-bold uppercase tracking-widest text-xs transition-all duration-300 border backdrop-blur-sm group ${isPresetsOpen ? 'bg-cyan-900/50 border-cyan-400 text-cyan-300 shadow-[0_0_20px_rgba(34,211,238,0.3)]' : 'bg-slate-800/80 border-slate-600 text-slate-300 hover:border-cyan-500 hover:text-cyan-400'} disabled:opacity-50 disabled:cursor-not-allowed`}>
                    <Layers size={16} className={isPresetsOpen ? 'animate-pulse' : 'group-hover:text-cyan-400'} />
                    Quick Presets
                    <ChevronDown size={16} className={`transition-transform duration-300 ${isPresetsOpen ? 'rotate-180 text-cyan-400' : ''}`} />
                  </button>
                </div>
                
                <div className="relative group/prompt">
                  <textarea 
                    value={prompt} 
                    onChange={(e) => setPrompt(e.target.value)} 
                    disabled={loadingState} 
                    className="w-full h-28 bg-black/50 border border-slate-700 rounded-xl p-4 pr-12 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/50 resize-none transition-all disabled:opacity-50 shadow-inner select-text custom-scrollbar" 
                    placeholder="원하는 배경과 분위기를 상세히 입력해주세요..." 
                  />
                  {prompt && !loadingState && (
                    <button onClick={() => setPrompt("")} className="absolute top-2 right-2 p-2 text-slate-500 hover:text-rose-500 transition-colors z-20 flex items-center justify-center active:scale-90">
                      <div className="w-5 h-5 bg-slate-800/80 rounded-full border border-slate-700/50 flex items-center justify-center shadow-lg">
                        <X size={12} strokeWidth={3} />
                      </div>
                    </button>
                  )}
                  {isPresetsOpen && (
                    <div className="absolute left-0 right-0 -top-2 transition-all duration-400 ease-in-out origin-top z-40 opacity-100 scale-y-100 pointer-events-auto">
                      <div className="bg-slate-900 border border-cyan-500/50 rounded-2xl p-4 sm:p-5 shadow-[0_30px_60px_rgba(0,0,0,0.9)] relative overflow-hidden">
                        <div className="flex items-center justify-between mb-4">
                          <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-[0.3em]">Cloud Synced Presets</span>
                          <button disabled={loadingState} onClick={handleOpenAddPresetModal} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-900/50 border border-cyan-500/50 text-cyan-300 hover:bg-cyan-500 hover:text-white transition-colors text-[10px] font-bold uppercase tracking-widest">
                            <Plus size={12} /> Add New
                          </button>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[250px] overflow-y-auto pr-2 pb-1 custom-scrollbar">
                          {presets.map((preset) => (
                            <div key={preset.id} className="relative group/preset">
                              <div className={`flex flex-col h-full rounded-xl border transition-all duration-300 overflow-hidden bg-slate-800 ${prompt === preset.prompt ? 'border-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.3)] bg-slate-800/80' : 'border-slate-600/50 hover:border-cyan-500/50'}`}>
                                <button disabled={loadingState} onClick={() => handlePresetClick(preset.prompt)} className="w-full text-left p-3 pb-2 flex-grow focus:outline-none">
                                  <span className={`text-xs font-bold uppercase tracking-widest line-clamp-1 ${prompt === preset.prompt ? 'text-cyan-300' : 'text-slate-200'}`}>{preset.label}</span>
                                  <p className="text-[10px] text-slate-400 mt-1 line-clamp-2 opacity-80 group-hover/preset:opacity-100 transition-opacity">{preset.prompt}</p>
                                </button>
                                <div className="flex justify-end gap-2 px-3 pb-2 pt-1 border-t border-slate-700/50">
                                  <button onClick={(e) => handleOpenEditPresetModal(e, preset)} disabled={loadingState} className="text-slate-400 hover:text-cyan-400 p-1.5 bg-slate-900/50 rounded-md transition-colors"><Pencil size={12} /></button>
                                  <button onClick={(e) => handleDeletePresetClick(e, preset)} disabled={loadingState} className="text-slate-400 hover:text-rose-400 p-1.5 bg-slate-900/50 rounded-md transition-colors"><Trash2 size={12} /></button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-slate-900/80 backdrop-blur-sm border border-slate-800 rounded-3xl p-6 flex flex-col shadow-2xl relative min-h-[500px]">
                <div className="flex items-center gap-2 mb-4 border-l-4 border-cyan-500 pl-3 shrink-0">
                  <Zap className="text-cyan-400" size={20} />
                  <h3 className="text-lg font-bold uppercase tracking-tighter italic text-slate-200">3. Ultra Output</h3>
                </div>

                <div className="flex-grow flex flex-col items-center justify-center rounded-2xl border border-slate-800/50 bg-black/80 overflow-hidden relative shadow-inner min-h-[400px]">
                  {loadingState ? (
                    <div className="flex flex-col items-center p-8 h-full justify-center animate-in fade-in duration-500">
                      <div className="relative mb-16 w-64 h-64 flex items-center justify-center">
                        <div className="absolute inset-0 border border-cyan-500/10 rounded-full animate-[spin_15s_linear_infinite]">
                           {[...Array(24)].map((_, i) => (
                             <div key={i} className="absolute w-1 h-1 bg-cyan-400/40 rounded-full" style={{ transform: `rotate(${i * 15}deg) translateY(-120px)` }}></div>
                           ))}
                        </div>
                        <div className="absolute inset-6 border-[0.5px] border-cyan-400/20 rounded-full animate-[spin_4s_linear_infinite]"></div>
                        <div className="absolute inset-10 border-[0.5px] border-rose-500/20 rounded-full animate-[spin_7s_linear_infinite_reverse]"></div>
                        <div className="relative w-32 h-32 flex items-center justify-center">
                          <div className="absolute inset-0 bg-cyan-500/5 rounded-full blur-[40px] animate-[nebula_pulse_3s_ease-in-out_infinite]"></div>
                          <div className="absolute inset-2 bg-rose-500/5 rounded-full blur-[30px] animate-[nebula_pulse_3s_ease-in-out_infinite_1.5s]"></div>
                          <div className="absolute inset-0 flex items-center justify-center opacity-40">
                             <div className="w-full h-full border border-cyan-400/40 rounded-full animate-[spin_2s_linear_infinite]"></div>
                             <div className="absolute w-[110%] h-[1px] bg-cyan-400 animate-pulse"></div>
                             <div className="absolute w-[1px] h-[110%] bg-cyan-400 animate-pulse"></div>
                          </div>
                          <div className="w-24 h-24 bg-slate-950 rounded-full border-2 border-white/20 shadow-[0_0_50px_rgba(34,211,238,0.4),inset_0_0_30px_rgba(34,211,238,0.2)] flex items-center justify-center overflow-hidden">
                            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,#fff_0%,#0ea5e9_60%)] opacity-0 animate-[core_beat_1.5s_ease-in-out_infinite]"></div>
                            <div className="z-10 relative">
                               <Atom size={36} className="text-white drop-shadow-[0_0_15px_rgba(255,255,255,1)] animate-[spin_5s_linear_infinite]" />
                            </div>
                          </div>
                        </div>
                        <div className="absolute inset-0 pointer-events-none">
                           {[...Array(6)].map((_, i) => (
                             <div key={i} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1px] h-32 bg-gradient-to-t from-transparent via-cyan-400 to-transparent opacity-0 animate-[energy_burst_2s_ease-out_infinite]" style={{ transform: `translate(-50%, -50%) rotate(${i * 60}deg) translateY(-80px)`, animationDelay: `${i * 0.2}s` }}></div>
                           ))}
                        </div>
                      </div>
                      <div className="flex flex-col items-center gap-3 relative z-10">
                        <p className="text-cyan-400 font-black text-[10px] sm:text-xs tracking-[0.6em] animate-pulse text-center uppercase text-shadow-glow">Matter Reconstitution in Progress</p>
                        <div className="flex gap-2">
                           <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-[ping_1.5s_infinite]"></span>
                           <span className="w-1.5 h-1.5 bg-rose-500 rounded-full animate-[ping_1.5s_infinite_0.4s]"></span>
                           <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-[ping_1.5s_infinite_0.8s]"></span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="w-full h-full flex flex-col p-4 gap-4">
                      <div onClick={() => resultImage && setIsViewerOpen(true)} className={`flex-grow flex items-center justify-center overflow-hidden bg-black/60 rounded-xl border border-white/5 relative group/result ${resultImage ? 'cursor-zoom-in' : ''}`}>
                        {resultImage ? (
                          <div className="w-full h-full flex items-center justify-center relative overflow-hidden">
                            <div className="absolute inset-0 z-20 pointer-events-none">
                               <div className="absolute inset-0 bg-white opacity-0 animate-[specium_flash_1.8s_ease-out_forwards]"></div>
                               <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-0 h-0 border-[2px] border-cyan-400 rounded-full opacity-0 animate-[spatial_ripple_1.5s_ease-out_forwards]"></div>
                               <div className="absolute inset-0 bg-gradient-to-r from-cyan-400/20 via-white/40 to-cyan-400/20 opacity-0 animate-[scan_sweep_v3_1s_ease-out_forwards]"></div>
                            </div>
                            <img src={resultImage} alt="Result" className="max-h-[95%] max-w-[95%] object-contain transition-all duration-1000 animate-[specium_spawn_1.8s_cubic-bezier(0.16,1,0.3,1)_forwards] group-hover:scale-[1.03] group-hover:brightness-110" />
                          </div>
                        ) : (
                          <div className="text-center p-8 opacity-10 flex flex-col items-center justify-center h-full animate-in fade-in duration-1000">
                            <ImageIcon className="w-20 h-20 mx-auto mb-4 text-slate-500" />
                            <p className="font-black tracking-widest text-[11px] uppercase font-mono">Quantum Field Offline</p>
                          </div>
                        )}
                      </div>
                      {history.length > 0 && (
                        <div className="shrink-0 pt-2 border-t border-slate-800/50">
                          <div className="flex gap-3 overflow-x-auto p-2 custom-scrollbar pr-2">
                            {history.map((img, idx) => (
                              <div key={idx} onClick={() => setResultImage(img)} className={`relative shrink-0 w-16 h-16 rounded-xl border-2 cursor-pointer transition-all duration-300 hover:scale-110 flex items-center justify-center bg-slate-900 overflow-hidden ${resultImage === img ? 'border-cyan-400 ring-4 ring-cyan-500/20' : 'border-slate-800'}`}>
                                <img src={img} className="w-full h-full object-cover pointer-events-none" alt={`History ${idx}`} />
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {resultImage && (
                        <div className={`shrink-0 bg-slate-900/95 backdrop-blur-xl rounded-2xl p-4 shadow-lg transition-all duration-300 border ${isSaving ? 'border-cyan-400' : 'border-cyan-500/30'}`}>
                          {isSaving ? (
                            <div className="flex flex-col gap-3">
                              <div className="flex items-center gap-3 px-4 py-2.5 bg-black/60 rounded-xl border border-slate-700/80 overflow-hidden">
                                <Pencil size={16} className="text-cyan-400 shrink-0" />
                                <input type="text" value={filename} onChange={(e) => setFilename(e.target.value)} className="bg-transparent text-sm font-mono text-cyan-50 outline-none w-full select-text" placeholder="파일명 입력" autoFocus />
                              </div>
                              <div className="flex gap-2 mt-1">
                                <button onClick={() => setIsSaving(false)} className="flex-1 py-2.5 bg-slate-800 text-slate-300 rounded-xl text-xs font-bold uppercase tracking-widest">Cancel</button>
                                <button onClick={handleDownload} className="flex-1 py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-xl text-xs font-bold uppercase tracking-widest">Confirm</button>
                              </div>
                            </div>
                          ) : (
                            <button onClick={() => setIsSaving(true)} className="w-full py-3 bg-gradient-to-r from-slate-800 to-slate-900 border border-transparent hover:border-cyan-400 text-cyan-50 font-black uppercase text-xs tracking-[0.2em] rounded-xl transition-all flex items-center justify-center gap-2 group">
                              <Download size={16} className="text-cyan-400" /> Extract Data
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex flex-col items-center pb-16 gap-6">
              <div className="flex flex-col items-center gap-3 w-full max-w-lg relative z-10">
                <button
                  onClick={() => handleStartEditing()}
                  disabled={targets.length === 0 || loadingState || !prompt.trim()}
                  className={`relative w-full overflow-hidden px-12 py-6 rounded-full font-black text-xl tracking-[0.2em] transition-all border ${(!targets.length || !prompt.trim()) ? 'bg-slate-800/50 text-slate-500 border-slate-700/50' : loadingState ? 'border-cyan-400 shadow-[0_0_50px_rgba(34,211,238,0.6)] scale-[1.02]' : 'bg-gradient-to-r from-rose-800 to-rose-600 text-white border-rose-400 shadow-[0_0_30px_rgba(225,29,72,0.4)] hover:-translate-y-1 active:translate-y-0 group italic'}`}
                >
                  <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(255,255,255,0.1)_50%,transparent_75%)] bg-[size:250%_250%] animate-[shimmer_3s_infinite] pointer-events-none"></div>
                  <span className={`relative z-10 flex items-center justify-center gap-4 transition-colors duration-300 ${loadingState ? 'text-white' : ''}`}>
                    {loadingState ? (
                      <>
                        <Activity className="animate-pulse text-cyan-200" size={26} />
                        <span className="tracking-[0.4em] font-black uppercase">Assembling...</span>
                      </>
                    ) : hasEdited ? (
                      <><RotateCcw size={22} /> RE-IGNITION</>
                    ) : (
                      <><Sparkles size={22} /> START PROTOCOL</>
                    )}
                  </span>
                </button>
                {loadingState && (
                  <button onClick={handleCancelSynthesis} className="flex items-center gap-2 mt-2 text-xs font-bold uppercase tracking-widest text-slate-500 hover:text-rose-500 transition-all duration-300">
                    <XCircle size={14} /> Abort Sync
                  </button>
                )}
              </div>
            </div>
          </div>
        ) : appState === 'create' ? (
          /* --- CREATE 모듈 화면 --- */
          <div className="animate-in fade-in slide-in-from-bottom-6 duration-700">
            {createError && (
              <div className="max-w-4xl mx-auto mb-6 bg-rose-500/10 border border-rose-500/50 rounded-2xl p-4 flex items-center gap-3 text-rose-400 animate-in fade-in slide-in-from-top-4">
                <AlertCircle size={20} className="shrink-0" />
                <p className="text-sm font-medium">{createError}</p>
              </div>
            )}

            <div className="flex flex-col gap-6 mb-12 relative z-20">
              <div className="bg-slate-900/80 backdrop-blur-sm border border-slate-700/80 rounded-3xl p-6 shadow-2xl relative z-30" ref={createPresetsContainerRef}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 border-l-4 border-purple-500 pl-3 relative z-50">
                  <div className="flex items-center gap-2">
                    <Terminal className="text-purple-400" size={20} />
                    <h3 className="text-lg font-bold uppercase tracking-tighter italic text-slate-200">1. Command Directive</h3>
                  </div>
                  <button onClick={toggleCreatePresetsMenu} disabled={createLoadingState} className={`flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-bold uppercase tracking-widest text-xs transition-all duration-300 border backdrop-blur-sm group ${isCreatePresetsOpen ? 'bg-purple-900/50 border-purple-400 text-purple-300 shadow-[0_0_20px_rgba(168,85,247,0.3)]' : 'bg-slate-800/80 border-slate-600 text-slate-300 hover:border-purple-500 hover:text-purple-400'} disabled:opacity-50 disabled:cursor-not-allowed`}>
                    <Layers size={16} className={isCreatePresetsOpen ? 'animate-pulse' : 'group-hover:text-purple-400'} />
                    Quick Presets
                    <ChevronDown size={16} className={`transition-transform duration-300 ${isCreatePresetsOpen ? 'rotate-180 text-purple-400' : ''}`} />
                  </button>
                </div>
                
                <div className="relative group/prompt">
                  <textarea 
                    value={createPrompt} 
                    onChange={(e) => setCreatePrompt(e.target.value)} 
                    disabled={createLoadingState} 
                    className="w-full h-32 bg-black/50 border border-slate-700 rounded-xl p-4 pr-12 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/50 resize-none transition-all disabled:opacity-50 shadow-inner select-text custom-scrollbar" 
                    placeholder="대화하듯 이미지를 만들어보세요. 예: '사이버펑크 스타일로 바꿔줘', '푸른빛을 추가해줘' 등 상세하게 묘사할수록 좋습니다." 
                  />
                  {createPrompt && !createLoadingState && (
                    <button onClick={() => setCreatePrompt("")} className="absolute top-2 right-2 p-2 text-slate-500 hover:text-rose-500 transition-colors z-20 flex items-center justify-center active:scale-90">
                      <div className="w-5 h-5 bg-slate-800/80 rounded-full border border-slate-700/50 flex items-center justify-center shadow-lg">
                        <X size={12} strokeWidth={3} />
                      </div>
                    </button>
                  )}
                  
                  {/* 추가된 툴바 영역 (참고 이미지, 비율) */}
                  <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
                    <div className="flex flex-wrap items-center gap-3">
                      {/* 참고 이미지 업로드 버튼 */}
                      <label className="cursor-pointer flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest bg-slate-800 hover:bg-purple-900/50 text-slate-300 border border-slate-700 hover:border-purple-500 rounded-xl px-4 py-2 transition-all shadow-sm">
                        <ImagePlus size={16} className="text-purple-400" />
                        <span>참고 이미지</span>
                        <input type="file" accept="image/*" className="hidden" onChange={handleCreateReferenceUpload} disabled={createLoadingState} />
                      </label>
                      
                      {/* 비율 선택 툴 */}
                      <div className="flex bg-slate-800/80 rounded-xl border border-slate-700 p-1">
                        {["1:1", "16:9", "9:16"].map(ratio => (
                          <button 
                            key={ratio}
                            onClick={() => setCreateAspectRatio(ratio)}
                            disabled={createLoadingState}
                            className={`px-4 py-1.5 rounded-lg text-[10px] font-black transition-all ${createAspectRatio === ratio ? 'bg-purple-600 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}
                          >
                            {ratio}
                          </button>
                        ))}
                      </div>
                    </div>
                    
                    {/* 참고 이미지 썸네일 표시 */}
                    {createReferenceImage && (
                      <div className="relative w-16 h-16 rounded-xl border-2 border-purple-500/80 overflow-hidden group/ref shadow-[0_0_15px_rgba(168,85,247,0.3)]">
                        <img src={createReferenceImage} className="w-full h-full object-cover" alt="Reference" />
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover/ref:opacity-100 transition-opacity flex items-center justify-center">
                           <button onClick={() => setCreateReferenceImage(null)} disabled={createLoadingState} className="bg-rose-500 hover:bg-rose-600 text-white rounded-full p-1.5 transition-colors">
                              <Trash2 size={12} />
                           </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {isCreatePresetsOpen && (
                    <div className="absolute left-0 right-0 -top-2 transition-all duration-400 ease-in-out origin-top z-40 opacity-100 scale-y-100 pointer-events-auto">
                      <div className="bg-slate-900 border border-purple-500/50 rounded-2xl p-4 sm:p-5 shadow-[0_30px_60px_rgba(0,0,0,0.9)] relative overflow-hidden">
                        <div className="flex items-center justify-between mb-4">
                          <span className="text-[10px] font-mono text-purple-400 uppercase tracking-[0.3em]">Cloud Synced Presets</span>
                          <button disabled={createLoadingState} onClick={handleOpenAddCreatePresetModal} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-900/50 border border-purple-500/50 text-purple-300 hover:bg-purple-500 hover:text-white transition-colors text-[10px] font-bold uppercase tracking-widest">
                            <Plus size={12} /> Add New
                          </button>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[250px] overflow-y-auto pr-2 pb-1 custom-scrollbar">
                          {createPresets.map((preset) => (
                            <div key={preset.id} className="relative group/preset">
                              <div className={`flex flex-col h-full rounded-xl border transition-all duration-300 overflow-hidden bg-slate-800 ${createPrompt === preset.prompt ? 'border-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.3)] bg-slate-800/80' : 'border-slate-600/50 hover:border-purple-500/50'}`}>
                                <button disabled={createLoadingState} onClick={() => handleCreatePresetClick(preset.prompt)} className="w-full text-left p-3 pb-2 flex-grow focus:outline-none">
                                  <span className={`text-xs font-bold uppercase tracking-widest line-clamp-1 ${createPrompt === preset.prompt ? 'text-purple-300' : 'text-slate-200'}`}>{preset.label}</span>
                                  <p className="text-[10px] text-slate-400 mt-1 line-clamp-2 opacity-80 group-hover/preset:opacity-100 transition-opacity">{preset.prompt}</p>
                                </button>
                                <div className="flex justify-end gap-2 px-3 pb-2 pt-1 border-t border-slate-700/50">
                                  <button onClick={(e) => handleOpenEditCreatePresetModal(e, preset)} disabled={createLoadingState} className="text-slate-400 hover:text-purple-400 p-1.5 bg-slate-900/50 rounded-md transition-colors"><Pencil size={12} /></button>
                                  <button onClick={(e) => handleDeleteCreatePresetClick(e, preset)} disabled={createLoadingState} className="text-slate-400 hover:text-rose-400 p-1.5 bg-slate-900/50 rounded-md transition-colors"><Trash2 size={12} /></button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-slate-900/80 backdrop-blur-sm border border-slate-800 rounded-3xl p-6 flex flex-col shadow-2xl relative min-h-[500px]">
                <div className="flex items-center gap-2 mb-4 border-l-4 border-purple-500 pl-3 shrink-0">
                  <ImagePlus className="text-purple-400" size={20} />
                  <h3 className="text-lg font-bold uppercase tracking-tighter italic text-slate-200">2. Idea Materialization</h3>
                </div>

                <div className="flex-grow flex flex-col items-center justify-center rounded-2xl border border-slate-800/50 bg-black/80 overflow-hidden relative shadow-inner min-h-[400px]">
                  {createLoadingState ? (
                    <div className="flex flex-col items-center p-8 h-full justify-center animate-in fade-in duration-500">
                      <div className="relative mb-16 w-64 h-64 flex items-center justify-center">
                        <div className="absolute inset-0 border border-purple-500/10 rounded-full animate-[spin_10s_linear_infinite]">
                           {[...Array(12)].map((_, i) => (
                             <div key={i} className="absolute w-2 h-2 bg-purple-400/30 rounded-full" style={{ transform: `rotate(${i * 30}deg) translateY(-120px)` }}></div>
                           ))}
                        </div>
                        <div className="absolute inset-8 border border-cyan-400/20 rounded-full animate-[spin_5s_linear_infinite_reverse]"></div>
                        <div className="relative w-32 h-32 flex items-center justify-center">
                          <div className="absolute inset-0 bg-purple-500/10 rounded-full blur-[40px] animate-[nebula_pulse_3s_ease-in-out_infinite]"></div>
                          <div className="w-20 h-20 bg-slate-950 rounded-full border-2 border-purple-500/40 shadow-[0_0_50px_rgba(168,85,247,0.4)] flex items-center justify-center overflow-hidden">
                            <div className="z-10 relative">
                               <Paintbrush size={32} className="text-purple-300 drop-shadow-[0_0_15px_rgba(255,255,255,0.8)] animate-pulse" />
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col items-center gap-3 relative z-10">
                        <p className="text-purple-400 font-black text-[10px] sm:text-xs tracking-[0.6em] animate-pulse text-center uppercase text-shadow-glow">Visualizing Concepts...</p>
                      </div>
                    </div>
                  ) : (
                    <div className="w-full h-full flex flex-col p-4 gap-4">
                      <div onClick={() => createResultImage && setIsViewerOpen(true)} className={`flex-grow flex items-center justify-center overflow-hidden bg-black/60 rounded-xl border border-white/5 relative group/result ${createResultImage ? 'cursor-zoom-in' : ''}`}>
                        {createResultImage ? (
                          <div className="w-full h-full flex items-center justify-center relative overflow-hidden">
                            <img src={createResultImage} alt="Create Result" className="max-h-[95%] max-w-[95%] object-contain transition-all duration-1000 animate-in zoom-in-95 group-hover:scale-[1.03] group-hover:brightness-110" />
                          </div>
                        ) : (
                          <div className="text-center p-8 opacity-10 flex flex-col items-center justify-center h-full animate-in fade-in duration-1000">
                            <ImageIcon className="w-20 h-20 mx-auto mb-4 text-slate-500" />
                            <p className="font-black tracking-widest text-[11px] uppercase font-mono">Awaiting Prompt</p>
                          </div>
                        )}
                      </div>
                      
                      {createHistory.length > 0 && (
                        <div className="shrink-0 pt-2 border-t border-slate-800/50">
                          <div className="flex gap-3 overflow-x-auto p-2 custom-scrollbar pr-2">
                            {createHistory.map((img, idx) => (
                              <div key={idx} onClick={() => setCreateResultImage(img)} className={`relative shrink-0 w-16 h-16 rounded-xl border-2 cursor-pointer transition-all duration-300 hover:scale-110 flex items-center justify-center bg-slate-900 overflow-hidden ${createResultImage === img ? 'border-purple-400 ring-4 ring-purple-500/20' : 'border-slate-800'}`}>
                                <img src={img} className="w-full h-full object-cover pointer-events-none" alt={`Create History ${idx}`} />
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {createResultImage && (
                        <div className={`shrink-0 bg-slate-900/95 backdrop-blur-xl rounded-2xl p-4 shadow-lg transition-all duration-300 border ${isCreateSaving ? 'border-purple-400' : 'border-purple-500/30'}`}>
                          {isCreateSaving ? (
                            <div className="flex flex-col gap-3">
                              <div className="flex items-center gap-3 px-4 py-2.5 bg-black/60 rounded-xl border border-slate-700/80 overflow-hidden">
                                <Pencil size={16} className="text-purple-400 shrink-0" />
                                <input type="text" value={createFilename} onChange={(e) => setCreateFilename(e.target.value)} className="bg-transparent text-sm font-mono text-purple-50 outline-none w-full select-text" placeholder="파일명 입력" autoFocus />
                              </div>
                              <div className="flex gap-2 mt-1">
                                <button onClick={() => setIsCreateSaving(false)} className="flex-1 py-2.5 bg-slate-800 text-slate-300 rounded-xl text-xs font-bold uppercase tracking-widest">Cancel</button>
                                <button onClick={handleCreateDownload} className="flex-1 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl text-xs font-bold uppercase tracking-widest">Confirm</button>
                              </div>
                            </div>
                          ) : (
                            <button onClick={() => setIsCreateSaving(true)} className="w-full py-3 bg-gradient-to-r from-slate-800 to-slate-900 border border-transparent hover:border-purple-400 text-purple-50 font-black uppercase text-xs tracking-[0.2em] rounded-xl transition-all flex items-center justify-center gap-2 group">
                              <Download size={16} className="text-purple-400" /> Save Creation
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex flex-col items-center pb-16 gap-6 relative z-10">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full max-w-2xl">
                <button
                  onClick={handleCreateNewImage}
                  disabled={createLoadingState || !createPrompt.trim()}
                  className={`w-full py-4 rounded-2xl font-black text-sm tracking-widest uppercase transition-all flex items-center justify-center gap-2 ${(!createPrompt.trim()) ? 'bg-slate-800/50 text-slate-500 border border-slate-700/50' : createLoadingState ? 'border border-purple-500 bg-purple-900/20 text-purple-300' : 'bg-gradient-to-r from-purple-700 to-purple-500 text-white hover:scale-[1.02] active:scale-95 shadow-[0_0_20px_rgba(168,85,247,0.3)]'}`}
                >
                  <Sparkles size={18} /> GENERATE
                </button>
                
                <button
                  onClick={() => handleCreateContinueImage()}
                  disabled={createLoadingState || !createPrompt.trim() || !createResultImage}
                  className={`w-full py-4 rounded-2xl font-black text-sm tracking-widest uppercase transition-all flex items-center justify-center gap-2 ${(!createPrompt.trim() || !createResultImage) ? 'bg-slate-800/50 text-slate-500 border border-slate-700/50' : createLoadingState ? 'border border-cyan-500 bg-cyan-900/20 text-cyan-300' : 'bg-gradient-to-r from-cyan-700 to-cyan-500 text-white hover:scale-[1.02] active:scale-95 shadow-[0_0_20px_rgba(34,211,238,0.3)]'}`}
                >
                  <Pencil size={18} /> CONTINUE
                </button>

                <button
                  onClick={handleCreateRemakeImage}
                  disabled={createLoadingState || !createPrompt.trim() || !lastCreateAction}
                  className={`w-full py-4 rounded-2xl font-black text-sm tracking-widest uppercase transition-all flex items-center justify-center gap-2 ${(!createPrompt.trim() || !lastCreateAction) ? 'bg-slate-800/50 text-slate-500 border border-slate-700/50' : createLoadingState ? 'border border-rose-500 bg-rose-900/20 text-rose-300' : 'bg-gradient-to-r from-slate-700 to-slate-600 text-white hover:scale-[1.02] active:scale-95 shadow-[0_0_20px_rgba(255,255,255,0.1)]'}`}
                >
                  <RotateCcw size={18} /> REMAKE
                </button>
              </div>
              
              {createLoadingState && (
                <button onClick={() => { isCreateCancelledRef.current = true; if (createAbortControllerRef.current) createAbortControllerRef.current.abort(); setCreateLoadingState(false); }} className="flex items-center gap-2 mt-2 text-xs font-bold uppercase tracking-widest text-slate-500 hover:text-rose-500 transition-all duration-300">
                  <XCircle size={14} /> Abort Creation
                </button>
              )}
            </div>
          </div>
        ) : appState === 'collection' ? (
          /* --- SPECIUM COLLECTION 목록 화면 --- */
          <div className="animate-in fade-in slide-in-from-bottom-6 duration-700">
            <div className="flex justify-between items-center mb-6 border-l-4 border-cyan-500 pl-4">
              <div className="flex flex-col">
                <h3 className="text-xl font-black uppercase tracking-widest italic text-white">Archives</h3>
                <p className="text-[10px] font-mono text-cyan-500 tracking-[0.3em] uppercase">Storage Capacity: {collections.length}</p>
              </div>
              <button 
                onClick={() => { resetCollectionForm(); setAppState('add-collection'); }}
                className="px-6 py-3 bg-cyan-600 hover:bg-cyan-500 text-white rounded-2xl font-black uppercase tracking-widest text-xs flex items-center gap-2 transition-all shadow-[0_0_20px_rgba(8,145,178,0.3)] hover:scale-105 active:scale-95"
              >
                <Plus size={18} /> Register Toy
              </button>
            </div>

            {/* 필터 컨트롤 UI */}
            {collections.length > 0 && (
              <div className="flex flex-col sm:flex-row gap-4 mb-8">
                <div className="flex-1 relative z-30">
                  <UltraDropdown 
                    label="Filter by Brand"
                    placeholder="All Brands"
                    options={['All Brands', ...brands]}
                    value={filterBrand === 'ALL' ? 'All Brands' : filterBrand}
                    onChange={(val) => setFilterBrand(val === 'All Brands' ? 'ALL' : val)}
                  />
                </div>
                <div className="flex-1 relative z-20">
                  <UltraDropdown 
                    label="Filter by Category"
                    placeholder="All Categories"
                    options={['All Categories', ...categories]}
                    value={filterCategory === 'ALL' ? 'All Categories' : filterCategory}
                    onChange={(val) => setFilterCategory(val === 'All Categories' ? 'ALL' : val)}
                  />
                </div>
              </div>
            )}

            {collections.length === 0 ? (
              <div className="bg-slate-900/50 border border-slate-800 rounded-[2.5rem] p-16 flex flex-col items-center justify-center text-center opacity-40">
                <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center mb-6">
                  <BookOpen size={32} className="text-slate-500" />
                </div>
                <p className="font-black text-slate-400 uppercase tracking-widest italic">No specimens recorded</p>
                <p className="text-[10px] text-slate-500 mt-2 uppercase tracking-[0.2em]">Database is currently empty</p>
              </div>
            ) : filteredCollections.length === 0 ? (
              <div className="py-20 flex flex-col items-center justify-center text-slate-500">
                 <span className="font-black uppercase tracking-widest text-sm">No matching specimens</span>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-20">
                {filteredCollections.map((item) => (
                  <div 
                    key={item.id} 
                    onClick={() => { setSelectedCollection(item); setIsDetailOpen(true); }}
                    className="group bg-slate-900/80 border border-slate-800 rounded-[2rem] overflow-hidden hover:border-cyan-500/50 transition-all duration-500 cursor-pointer flex flex-col hover:shadow-[0_0_30px_rgba(34,211,238,0.15)] relative"
                  >
                    <div className="aspect-square w-full bg-black relative overflow-hidden">
                      {item.profileImages && item.profileImages[0] ? (
                        <img src={item.profileImages[0]} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" alt={item.name} />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-800"><ImageIcon size={48} /></div>
                      )}
                      <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                        <button onClick={(e) => handleEditCollectionStart(e, item)} className="p-2 bg-black/60 backdrop-blur-md rounded-full text-white hover:text-cyan-400 transition-colors border border-white/10"><Pencil size={14} /></button>
                        <button onClick={(e) => handleDeleteCollection(e, item.id)} className="p-2 bg-black/60 backdrop-blur-md rounded-full text-white hover:text-rose-500 transition-colors border border-white/10"><Trash2 size={14} /></button>
                      </div>
                      <div className="absolute bottom-0 left-0 right-0 p-5 pt-16 bg-gradient-to-t from-black via-black/80 to-transparent">
                         <span className="text-sm font-black text-cyan-300 uppercase tracking-[0.2em] drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">{item.brand || 'No Brand'}</span>
                      </div>
                    </div>
                    <div className="p-6 flex flex-col gap-2">
                      <h4 className="font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-300 italic uppercase tracking-tighter truncate text-2xl group-hover:from-cyan-400 group-hover:to-cyan-200 transition-all drop-shadow-md">{item.name}</h4>
                      <p className="text-cyan-100/70 text-xs font-bold uppercase tracking-widest truncate">{item.series || 'No Series Data'}</p>
                      <div className="mt-3 pt-3 border-t border-slate-800 flex justify-between items-center">
                         <div className="flex gap-1">
                           {[...Array(5)].map((_, i) => (
                             <Star key={i} size={10} className={i < item.ratingAppearance ? 'text-rose-500 fill-rose-500' : 'text-slate-800'} />
                           ))}
                         </div>
                         <span className="text-[9px] font-mono text-slate-500">{item.creationDate}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          /* --- SPECIUM COLLECTION 등록/수정 화면 --- */
          <div className="animate-in fade-in slide-in-from-bottom-6 duration-700 pb-20">
            <div className="flex items-center gap-4 mb-6">
              <button 
                onClick={() => setAppState('collection')}
                className="p-3 bg-slate-800 hover:bg-slate-700 text-white rounded-full transition-all active:scale-90"
              >
                <X size={20} />
              </button>
              <h2 className="text-2xl font-black uppercase italic tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-500">
                {isEditingCollection ? 'Refine Specimen' : 'New Specimen Registration'}
              </h2>
            </div>

            {/* 에러 표시 영역 (1MB 제한 초과 등) */}
            {error && (
              <div className="mb-8 bg-rose-500/10 border border-rose-500/50 rounded-2xl p-4 flex items-center gap-3 text-rose-400 animate-in fade-in slide-in-from-top-4">
                <AlertCircle size={20} className="shrink-0" />
                <p className="text-sm font-medium">{error}</p>
              </div>
            )}

            <div className="space-y-8">
              {/* 1. 완구 프로파일 사진 */}
              <section className="bg-slate-900/60 rounded-[2.5rem] border border-slate-800 p-8">
                <div className="flex items-center gap-2 mb-6 border-l-4 border-cyan-500 pl-4">
                  <ImageIcon className="text-cyan-400" size={18} />
                  <h3 className="text-sm font-black uppercase tracking-[0.2em]">1. Toy Profiles (Max 4)</h3>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {[0, 1, 2, 3].map(idx => (
                    <div 
                      key={idx}
                      onClick={() => handleCollectionImageUpload('profile', idx)}
                      className="aspect-square rounded-2xl border-2 border-dashed border-slate-800 hover:border-cyan-500/50 bg-black/40 flex items-center justify-center cursor-pointer overflow-hidden group relative transition-all"
                    >
                      {collectionForm.profileImages[idx] ? (
                        <img src={collectionForm.profileImages[idx]} className="w-full h-full object-cover" alt={`profile-${idx}`} />
                      ) : (
                        <div className="flex flex-col items-center gap-2 opacity-30 group-hover:opacity-100 transition-opacity">
                          <Camera size={24} />
                          <span className="text-[9px] font-black uppercase">Slot {idx+1}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </section>

              {/* 2. 브랜드 & 카테고리 셀렉터 (Custom) */}
              <section className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                 <div className="bg-slate-900/60 rounded-[2.5rem] border border-slate-800 p-8">
                    <UltraDropdown 
                      label="브랜드 선택"
                      placeholder="브랜드를 선택하세요"
                      options={brands}
                      value={collectionForm.brand}
                      onChange={(val) => setCollectionForm({ ...collectionForm, brand: val })}
                      onManage={() => setManageType('brand')}
                    />
                 </div>
                 <div className="bg-slate-900/60 rounded-[2.5rem] border border-slate-800 p-8">
                    <UltraDropdown 
                      label="카테고리 선택"
                      placeholder="카테고리를 선택하세요"
                      options={categories}
                      value={collectionForm.category}
                      onChange={(val) => setCollectionForm({ ...collectionForm, category: val })}
                      onManage={() => setManageType('category')}
                    />
                 </div>
              </section>

              {/* 3. 기본 정보 입력 */}
              <section className="bg-slate-900/60 rounded-[2.5rem] border border-slate-800 p-8 space-y-6">
                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="space-y-2">
                       <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Toy Series</span>
                       <input 
                         type="text" 
                         value={collectionForm.series} 
                         onChange={(e) => setCollectionForm({ ...collectionForm, series: e.target.value })}
                         className="w-full bg-black/50 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-cyan-50 transition-all select-text" 
                         placeholder="Ex: Gundam 00" 
                       />
                    </div>
                    <div className="space-y-2">
                       <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Toy Official Name</span>
                       <input 
                         type="text" 
                         value={collectionForm.name} 
                         onChange={(e) => setCollectionForm({ ...collectionForm, name: e.target.value })}
                         className="w-full bg-black/50 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-cyan-500 transition-all select-text" 
                         placeholder="Ex: MG Exia Dark Matter" 
                       />
                    </div>
                 </div>
                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="space-y-2">
                       <UltraCalendar 
                         value={collectionForm.creationDate}
                         onChange={(val) => setCollectionForm({ ...collectionForm, creationDate: val })}
                       />
                    </div>
                    <div className="space-y-2">
                       <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Size</span>
                       <div className="relative">
                          <input 
                            type="number" 
                            inputMode="numeric"
                            value={collectionForm.sizeCm} 
                            onChange={(e) => setCollectionForm({ ...collectionForm, sizeCm: e.target.value })}
                            className="w-full bg-black/50 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-cyan-500 pr-12 select-text" 
                            placeholder="0" 
                          />
                          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-500 uppercase">cm</span>
                       </div>
                    </div>
                 </div>
              </section>

              {/* 4. 설명서 다중 업로드 */}
              <section className="bg-slate-900/60 rounded-[2.5rem] border border-slate-800 p-8 space-y-4">
                <div className="flex items-center justify-between border-l-4 border-slate-500 pl-4 mb-6">
                  <div className="flex items-center gap-2">
                    <BookOpen className="text-slate-400" size={18} />
                    <h3 className="text-sm font-black uppercase tracking-[0.2em]">Instruction Manuals ({collectionForm.manualImages.length}/2)</h3>
                  </div>
                  {collectionForm.manualImages.length < 2 && (
                    <button onClick={() => handleCollectionImageUpload('manual')} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors flex items-center gap-2">
                      <Plus size={14} /> Add Images
                    </button>
                  )}
                </div>
                {collectionForm.manualImages.length > 0 ? (
                  <div className="flex gap-4 overflow-x-auto pb-4 custom-scrollbar">
                    {collectionForm.manualImages.map((img, i) => (
                      <div key={i} className="relative shrink-0 w-32 md:w-40 aspect-[3/4] bg-black/40 rounded-2xl border border-slate-700 overflow-hidden group">
                        <img src={img} className="w-full h-full object-contain" alt={`manual-${i}`} />
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setCollectionForm(prev => ({ ...prev, manualImages: prev.manualImages.filter((_, idx) => idx !== i) }));
                          }} 
                          className="absolute top-2 right-2 p-1.5 bg-rose-600/90 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg hover:bg-rose-500"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                    {collectionForm.manualImages.length < 2 && (
                      <div onClick={() => handleCollectionImageUpload('manual')} className="shrink-0 w-32 md:w-40 aspect-[3/4] bg-black/40 rounded-2xl border-2 border-dashed border-slate-800 flex flex-col items-center justify-center cursor-pointer hover:border-cyan-500/50 transition-colors group">
                        <Plus size={24} className="text-slate-700 group-hover:text-cyan-500 transition-colors mb-2" />
                      </div>
                    )}
                  </div>
                ) : (
                  <div onClick={() => handleCollectionImageUpload('manual')} className="w-full h-40 bg-black/40 rounded-2xl border-2 border-dashed border-slate-800 flex flex-col items-center justify-center cursor-pointer hover:border-cyan-500/50 transition-colors group">
                    <BookOpen size={24} className="text-slate-700 group-hover:text-cyan-500 transition-colors mb-2" />
                    <span className="text-[9px] font-black uppercase text-slate-600">Upload Manual Images (Max 2)</span>
                  </div>
                )}
              </section>

              {/* 5. 캐릭터 카드 앞/뒷면 나란히 업로드 */}
              <section className="bg-slate-900/60 rounded-[2.5rem] border border-slate-800 p-8 space-y-4">
                <div className="flex items-center gap-2 border-l-4 border-slate-500 pl-4 mb-6">
                  <Sparkles className="text-slate-400" size={18} />
                  <h3 className="text-sm font-black uppercase tracking-[0.2em]">Character Cards (Front & Back)</h3>
                </div>
                <div className="grid grid-cols-2 gap-4 md:gap-8">
                  {/* 카드 앞면 */}
                  <div onClick={() => handleCollectionImageUpload('cardFront')} className="aspect-[3/4] md:aspect-auto md:h-64 bg-black/40 rounded-2xl border-2 border-dashed border-slate-800 flex flex-col items-center justify-center overflow-hidden relative cursor-pointer hover:border-cyan-500/50 transition-colors group">
                    {collectionForm.cardImageFront ? (
                      <>
                        <img src={collectionForm.cardImageFront} className="w-full h-full object-contain p-2" alt="card-front" />
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                          <span className="text-white text-xs font-bold uppercase tracking-widest border border-white/20 px-4 py-2 rounded-full">Change Front</span>
                        </div>
                      </>
                    ) : (
                      <>
                        <Sparkles size={24} className="text-slate-700 group-hover:text-cyan-500 transition-colors mb-2" />
                        <span className="text-[10px] font-black uppercase text-slate-600">Front Image</span>
                      </>
                    )}
                  </div>
                  
                  {/* 카드 뒷면 */}
                  <div onClick={() => handleCollectionImageUpload('cardBack')} className="aspect-[3/4] md:aspect-auto md:h-64 bg-black/40 rounded-2xl border-2 border-dashed border-slate-800 flex flex-col items-center justify-center overflow-hidden relative cursor-pointer hover:border-cyan-500/50 transition-colors group">
                    {collectionForm.cardImageBack ? (
                      <>
                        <img src={collectionForm.cardImageBack} className="w-full h-full object-contain p-2" alt="card-back" />
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                          <span className="text-white text-xs font-bold uppercase tracking-widest border border-white/20 px-4 py-2 rounded-full">Change Back</span>
                        </div>
                      </>
                    ) : (
                      <>
                        <Sparkles size={24} className="text-slate-700 group-hover:text-cyan-500 transition-colors mb-2" />
                        <span className="text-[10px] font-black uppercase text-slate-600">Back Image</span>
                      </>
                    )}
                  </div>
                </div>
              </section>

              {/* 6. 평가 기능 */}
              <section className="bg-slate-900/60 rounded-[2.5rem] border border-slate-800 p-8">
                 <div className="flex items-center gap-2 mb-8 border-l-4 border-rose-500 pl-4">
                  <Target className="text-rose-500" size={18} />
                  <h3 className="text-sm font-black uppercase tracking-[0.2em]">Evaluation Ratings</h3>
                </div>
                <div className="flex flex-col sm:flex-row gap-8 justify-between">
                  <StarRating 
                    label="외관" 
                    value={collectionForm.ratingAppearance} 
                    onChange={(v) => setCollectionForm({ ...collectionForm, ratingAppearance: v })} 
                  />
                  <StarRating 
                    label="조립 난이도" 
                    value={collectionForm.ratingDifficulty} 
                    onChange={(v) => setCollectionForm({ ...collectionForm, ratingDifficulty: v })} 
                  />
                  <StarRating 
                    label="가동 성능" 
                    value={collectionForm.ratingArticulation} 
                    onChange={(v) => setCollectionForm({ ...collectionForm, ratingArticulation: v })} 
                  />
                </div>
              </section>

              {/* 저장 버튼 */}
              <div className="flex gap-4">
                <button 
                  onClick={() => setAppState('collection')}
                  className="flex-1 py-5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-[2rem] font-black uppercase tracking-widest text-sm transition-all shadow-xl active:scale-95"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleSaveCollection}
                  disabled={loadingState || !collectionForm.name.trim()}
                  className="flex-[2] py-5 bg-gradient-to-r from-cyan-600 to-cyan-400 hover:from-cyan-500 hover:to-cyan-300 text-white rounded-[2rem] font-black uppercase tracking-widest text-sm transition-all shadow-[0_0_30px_rgba(8,145,178,0.4)] disabled:opacity-50 active:scale-95"
                >
                  {loadingState ? 'Synchronizing...' : isEditingCollection ? 'Update Archive' : 'Commit to Archives'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <UltraImageViewer src={isDetailViewerOpen ? detailViewerImage : (appState === 'create' ? createResultImage : resultImage)} isOpen={isViewerOpen || isDetailViewerOpen} onClose={() => { setIsViewerOpen(false); setIsDetailViewerOpen(false); }} />
      <InstallGuideModal isOpen={showInstallGuide} onClose={() => setShowInstallGuide(false)} />

      {/* --- Specium Collection 상세 보기 팝업 --- */}
      {isDetailOpen && selectedCollection && (
        <div className="fixed inset-0 z-[250] bg-black/95 backdrop-blur-xl flex items-center justify-center p-4 animate-in fade-in duration-300 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700/50 rounded-[2.5rem] w-full max-w-2xl shadow-[0_0_80px_rgba(0,0,0,0.8)] flex flex-col my-8">
            <div className="p-8 border-b border-slate-800 flex justify-between items-center bg-gradient-to-r from-slate-800/50 to-transparent">
               <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-black text-cyan-400 uppercase tracking-[0.3em]">{selectedCollection.brand || 'Original Brand'}</span>
                  <h3 className="text-2xl font-black text-white italic uppercase tracking-tighter">{selectedCollection.name}</h3>
               </div>
               <button onClick={() => setIsDetailOpen(false)} className="w-10 h-10 bg-slate-800 rounded-full flex items-center justify-center text-slate-400 hover:text-white transition-all"><X size={20} /></button>
            </div>
            
            <div className="p-8 space-y-8 max-h-[70vh] overflow-y-auto custom-scrollbar">
               <div className="grid grid-cols-2 gap-4">
                  {selectedCollection.profileImages?.map((img, i) => (
                    img && <img 
                      key={i} 
                      src={img} 
                      onClick={() => { setDetailViewerImage(img); setIsDetailViewerOpen(true); }}
                      className="w-full aspect-square object-cover rounded-2xl border border-slate-800 shadow-lg cursor-pointer hover:border-cyan-500/80 hover:shadow-[0_0_20px_rgba(34,211,238,0.2)] transition-all" 
                      alt={`detail-${i}`} 
                      title="Click to enlarge"
                    />
                  ))}
               </div>

               {/* 변경: 정보 필드 레이아웃 개선 (말줄임 현상 제거 및 Series 필드 길이 확보) */}
               <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="p-4 bg-slate-800/50 rounded-2xl border border-slate-700 sm:col-span-2">
                     <span className="text-[9px] font-black text-slate-500 uppercase block mb-1">Category</span>
                     <span className="text-xs font-bold text-white break-words whitespace-normal block">{selectedCollection.category || '-'}</span>
                  </div>
                  <div className="p-4 bg-slate-800/50 rounded-2xl border border-slate-700 sm:col-span-2">
                     <span className="text-[9px] font-black text-slate-500 uppercase block mb-1">Series</span>
                     <span className="text-xs font-bold text-white break-words whitespace-normal block">{selectedCollection.series || '-'}</span>
                  </div>
                  <div className="p-4 bg-slate-800/50 rounded-2xl border border-slate-700 sm:col-span-2">
                     <span className="text-[9px] font-black text-slate-500 uppercase block mb-1">Size</span>
                     <span className="text-xs font-bold text-white block">{selectedCollection.sizeCm} cm</span>
                  </div>
                  <div className="p-4 bg-slate-800/50 rounded-2xl border border-slate-700 sm:col-span-2">
                     <span className="text-[9px] font-black text-slate-500 uppercase block mb-1">Completed</span>
                     <span className="text-xs font-bold text-white block">{selectedCollection.creationDate}</span>
                  </div>
               </div>

               <div className="p-6 bg-slate-950/50 border border-slate-800 rounded-[2rem] flex flex-col sm:flex-row justify-between gap-6">
                  <StarRating label="외관" value={selectedCollection.ratingAppearance} disabled />
                  <StarRating label="조립 난이도" value={selectedCollection.ratingDifficulty} disabled />
                  <StarRating label="가동 성능" value={selectedCollection.ratingArticulation} disabled />
               </div>

               <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                  {(selectedCollection.manualImages?.length > 0 || selectedCollection.manualImage) && (
                    <div className="space-y-3 col-span-1 sm:col-span-2">
                       <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Manual Records</span>
                       <div className="flex gap-4 overflow-x-auto pb-2 custom-scrollbar">
                         {selectedCollection.manualImage && (
                           <img 
                             src={selectedCollection.manualImage} 
                             onClick={() => { setDetailViewerImage(selectedCollection.manualImage); setIsDetailViewerOpen(true); }}
                             className="h-48 md:h-64 rounded-2xl border border-slate-800 shadow-xl object-contain bg-black/40 p-2 shrink-0 cursor-pointer hover:border-cyan-500/80 hover:shadow-[0_0_20px_rgba(34,211,238,0.2)] transition-all" 
                             alt="manual-detail-old" 
                             title="Click to enlarge"
                           />
                         )}
                         {selectedCollection.manualImages?.map((img, i) => (
                           <img 
                             key={i} 
                             src={img} 
                             onClick={() => { setDetailViewerImage(img); setIsDetailViewerOpen(true); }}
                             className="h-48 md:h-64 rounded-2xl border border-slate-800 shadow-xl object-contain bg-black/40 p-2 shrink-0 cursor-pointer hover:border-cyan-500/80 hover:shadow-[0_0_20px_rgba(34,211,238,0.2)] transition-all" 
                             alt={`manual-detail-${i}`} 
                             title="Click to enlarge"
                           />
                         ))}
                       </div>
                    </div>
                  )}

                  {(selectedCollection.cardImageFront || selectedCollection.cardImageBack || selectedCollection.cardImage) && (
                    <div className="space-y-3 col-span-1 sm:col-span-2">
                       <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Collector Card</span>
                       <div className="grid grid-cols-2 gap-4">
                          {selectedCollection.cardImage && (
                            <img 
                              src={selectedCollection.cardImage} 
                              onClick={() => { setDetailViewerImage(selectedCollection.cardImage); setIsDetailViewerOpen(true); }}
                              className="w-full rounded-2xl border border-slate-800 shadow-xl bg-black/40 object-contain p-2 cursor-pointer hover:border-cyan-500/80 hover:shadow-[0_0_20px_rgba(34,211,238,0.2)] transition-all" 
                              alt="card-old" 
                              title="Click to enlarge"
                            />
                          )}
                          {selectedCollection.cardImageFront && (
                            <img 
                              src={selectedCollection.cardImageFront} 
                              onClick={() => { setDetailViewerImage(selectedCollection.cardImageFront); setIsDetailViewerOpen(true); }}
                              className="w-full rounded-2xl border border-slate-800 shadow-xl bg-black/40 object-contain p-2 cursor-pointer hover:border-cyan-500/80 hover:shadow-[0_0_20px_rgba(34,211,238,0.2)] transition-all" 
                              alt="card-front" 
                              title="Click to enlarge"
                            />
                          )}
                          {selectedCollection.cardImageBack && (
                            <img 
                              src={selectedCollection.cardImageBack} 
                              onClick={() => { setDetailViewerImage(selectedCollection.cardImageBack); setIsDetailViewerOpen(true); }}
                              className="w-full rounded-2xl border border-slate-800 shadow-xl bg-black/40 object-contain p-2 cursor-pointer hover:border-cyan-500/80 hover:shadow-[0_0_20px_rgba(34,211,238,0.2)] transition-all" 
                              alt="card-back" 
                              title="Click to enlarge"
                            />
                          )}
                       </div>
                    </div>
                  )}
               </div>
            </div>

            <div className="p-8 bg-slate-800/30 border-t border-slate-800 flex gap-4">
               <button onClick={(e) => { setIsDetailOpen(false); handleEditCollectionStart(e, selectedCollection); }} className="flex-1 py-4 bg-slate-800 hover:bg-slate-700 text-white rounded-2xl font-black uppercase text-xs tracking-widest transition-all">Edit Record</button>
               <button onClick={() => setIsDetailOpen(false)} className="flex-1 py-4 bg-cyan-600 hover:bg-cyan-500 text-white rounded-2xl font-black uppercase text-xs tracking-widest transition-all shadow-[0_0_20px_rgba(8,145,178,0.2)]">Close Archives</button>
            </div>
          </div>
        </div>
      )}

      {/* --- 브랜드/카테고리 관리 모달 --- */}
      {manageType && (
        <div className="fixed inset-0 z-[260] bg-black/90 backdrop-blur-xl flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-slate-950 border border-slate-700/50 rounded-[2.5rem] w-full max-w-sm shadow-[0_0_80px_rgba(0,0,0,0.8)] p-8">
             <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-black uppercase italic tracking-tighter text-white">Manage {manageType === 'brand' ? 'Brands' : 'Categories'}</h3>
                <button onClick={() => setManageType(null)} className="text-slate-500 hover:text-white transition-colors"><X size={20} /></button>
             </div>
             <div className="flex gap-2 mb-6">
                <input 
                  type="text" 
                  value={manageInput} 
                  onChange={(e) => setManageInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleManageSubmit(); }}
                  className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-cyan-500 select-text" 
                  placeholder="New item..." 
                />
                <button onClick={handleManageSubmit} className="p-3 bg-cyan-600 rounded-xl text-white hover:bg-cyan-500 transition-colors shadow-lg"><Plus size={20} /></button>
             </div>
             <div className="max-h-48 overflow-y-auto custom-scrollbar space-y-2">
                {(manageType === 'brand' ? brands : categories).map(item => (
                  <div key={item} className="flex justify-between items-center p-3 bg-slate-900 rounded-xl border border-slate-800 group transition-all hover:border-slate-600">
                     <span className="text-sm font-bold text-slate-300 uppercase tracking-widest">{item}</span>
                     <button onClick={() => handleManageDelete(manageType, item)} className="text-slate-600 hover:text-rose-500 transition-colors opacity-0 group-hover:opacity-100"><Trash2 size={14} /></button>
                  </div>
                ))}
             </div>
          </div>
        </div>
      )}

      {/* --- 기타 모달 --- */}
      {(showPresetModal || showCreatePresetModal) && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl animate-in fade-in duration-200 select-none">
          <div className={`bg-slate-950 border rounded-3xl w-full max-lg overflow-hidden ${showCreatePresetModal ? 'border-purple-500/50 shadow-[0_0_80px_rgba(168,85,247,0.2)]' : 'border-cyan-500/50 shadow-[0_0_80px_rgba(34,211,238,0.2)]'}`}>
            <div className="p-8 flex flex-col gap-6">
              <h3 className={`text-xl font-black uppercase tracking-widest italic border-l-4 pl-4 ${showCreatePresetModal ? 'text-purple-400 border-purple-500' : 'text-cyan-400 border-cyan-500'}`}>Add Preset Directive</h3>
              <div className="space-y-4">
                <input type="text" value={showCreatePresetModal ? createPresetLabel : newPresetLabel} onChange={(e) => showCreatePresetModal ? setCreatePresetLabel(e.target.value) : setNewPresetLabel(e.target.value)} placeholder="예: 무한한 평원" className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white select-text" />
                <textarea value={showCreatePresetModal ? createPresetPrompt : newPresetPrompt} onChange={(e) => showCreatePresetModal ? setCreatePresetPrompt(e.target.value) : setNewPresetPrompt(e.target.value)} placeholder="명령어 입력" className="w-full h-32 bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white select-text resize-none" />
              </div>
              <div className="flex gap-4">
                <button onClick={() => { setShowPresetModal(false); setShowCreatePresetModal(false); }} className="flex-1 py-4 bg-slate-800 text-slate-300 rounded-xl text-xs font-bold uppercase tracking-widest">Cancel</button>
                <button onClick={showCreatePresetModal ? handleSaveCreatePreset : handleSavePreset} className={`flex-1 py-4 text-white rounded-xl text-xs font-bold uppercase tracking-widest ${showCreatePresetModal ? 'bg-purple-600 hover:bg-purple-500' : 'bg-cyan-600 hover:bg-cyan-500'}`}>Authorize Sync</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {(showDeleteConfirm || showCreateDeleteConfirm) && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/95 backdrop-blur-2xl animate-in fade-in zoom-in duration-200 select-none">
          <div className="bg-slate-950 border border-rose-600/50 rounded-3xl w-full max-sm p-8 text-center">
            <Trash2 size={32} className="text-rose-500 mx-auto mb-6" />
            <h3 className="text-2xl font-black text-white uppercase tracking-widest mb-2 italic">Data Erasure?</h3>
            <p className="text-slate-500 text-sm mb-10">프리셋 파일을 삭제하시겠습니까?</p>
            <div className="flex gap-4">
              <button onClick={() => { setShowDeleteConfirm(false); setShowCreateDeleteConfirm(false); }} className="flex-1 py-4 bg-slate-800 text-slate-300 rounded-xl text-xs font-bold uppercase tracking-widest">Abort</button>
              <button onClick={showCreateDeleteConfirm ? confirmDeleteCreatePreset : confirmDeletePreset} className="flex-1 py-4 bg-rose-600 text-white rounded-xl text-xs font-bold uppercase tracking-widest">Confirm Erase</button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 5px; height: 5px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(34, 211, 238, 0.2); border-radius: 10px; }
        .select-text { user-select: text !important; -webkit-user-select: text !important; }
        
        @keyframes scan_v2 {
          0% { top: 0%; opacity: 0; }
          15% { opacity: 0.8; }
          85% { opacity: 0.8; }
          100% { top: 100%; opacity: 0; }
        }

        @keyframes indexing {
          0% { width: 10px; height: 10px; top: 10%; left: 10%; opacity: 0; }
          20% { width: 80px; height: 80px; opacity: 1; }
          80% { opacity: 1; }
          100% { top: 80%; left: 70%; width: 20px; height: 20px; opacity: 0; }
        }

        @keyframes nebula_pulse {
          0%, 100% { transform: scale(1); opacity: 0.1; }
          50% { transform: scale(1.6); opacity: 0.3; }
        }

        @keyframes core_beat {
          0%, 100% { opacity: 0.4; transform: scale(0.9); }
          50% { opacity: 1; transform: scale(1.1); }
        }

        @keyframes energy_burst {
          0% { height: 0; opacity: 0; transform: translate(-50%, -50%) rotate(var(--tw-rotate)) translateY(-60px); }
          30% { opacity: 1; height: 120px; }
          100% { height: 0; opacity: 0; transform: translate(-50%, -50%) rotate(var(--tw-rotate)) translateY(-180px); }
        }

        @keyframes specium_spawn {
          0% { opacity: 0; transform: scale(0.85) translateY(30px); filter: brightness(3) blur(20px); }
          40% { opacity: 0.8; transform: scale(1.05) translateY(-5px); filter: brightness(1.5) blur(10px); }
          100% { opacity: 1; transform: scale(1) translateY(0); filter: brightness(1) blur(0); }
        }

        @keyframes specium_flash {
          0% { opacity: 1; }
          70% { opacity: 0.2; }
          100% { opacity: 0; }
        }

        @keyframes spatial_ripple {
          0% { width: 0; height: 0; opacity: 1; }
          100% { width: 200%; height: 200%; opacity: 0; }
        }

        @keyframes scan_sweep_v3 {
          0% { opacity: 0; transform: scaleX(0); }
          50% { opacity: 1; transform: scaleX(1); }
          100% { opacity: 0; transform: scaleX(1.5); }
        }

        @keyframes shimmer {
          0% { background-position: -150% -150%; }
          100% { background-position: 150% 150%; }
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default App;
