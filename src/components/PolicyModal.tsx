'use client';

import React, { useState } from 'react';
import { X, ShieldCheck, FileText, Truck, AlertCircle, CheckCircle2 } from 'lucide-react';

export type PolicyTab = 'terms' | 'privacy' | 'warranty';

interface PolicyModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: PolicyTab;
}

export const PolicyModal: React.FC<PolicyModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'terms',
}) => {
  const [activeTab, setActiveTab] = useState<PolicyTab>(initialTab);

  // Sync tab if initialTab changes when opening
  React.useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl relative text-zinc-100 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Bar */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800 bg-zinc-950/60 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-400/10 border border-amber-400/30 flex items-center justify-center text-amber-400">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">นโยบายและข้อกำหนด</h2>
              <p className="text-xs text-zinc-400">TOOL SHOP 226 Plus</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors cursor-pointer"
            title="ปิด"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-zinc-800 bg-zinc-950/40 px-3 pt-2 gap-1 shrink-0 overflow-x-auto no-scrollbar">
          <button
            type="button"
            onClick={() => setActiveTab('terms')}
            className={`flex items-center gap-2 px-3.5 py-2.5 text-xs sm:text-sm font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'terms'
                ? 'border-amber-400 text-amber-400 bg-amber-400/5 rounded-t-lg'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>ข้อกำหนดการใช้งาน</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('privacy')}
            className={`flex items-center gap-2 px-3.5 py-2.5 text-xs sm:text-sm font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'privacy'
                ? 'border-amber-400 text-amber-400 bg-amber-400/5 rounded-t-lg'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>ความเป็นส่วนตัว (PDPA)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('warranty')}
            className={`flex items-center gap-2 px-3.5 py-2.5 text-xs sm:text-sm font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'warranty'
                ? 'border-amber-400 text-amber-400 bg-amber-400/5 rounded-t-lg'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Truck className="w-4 h-4" />
            <span>การรับประกัน & จัดส่ง</span>
          </button>
        </div>

        {/* Modal Scrollable Content */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-4 text-xs sm:text-sm text-zinc-300 leading-relaxed">
          {activeTab === 'terms' && (
            <div className="space-y-4">
              <div className="bg-amber-400/10 border border-amber-400/30 p-3.5 rounded-xl flex items-start gap-2.5 text-amber-300 text-xs">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
                <span>
                  เว็บไซต์นี้เป็นแคตาล็อกแสดงรายละเอียดและราคาอุปกรณ์เครื่องมือช่างสำหรับการสั่งซื้อและการขอใบเสนอราคา
                </span>
              </div>

              <div>
                <h3 className="font-bold text-white text-sm mb-1.5 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-amber-400" /> 1. ข้อมูลสินค้า ราคา และความถูกต้อง
                </h3>
                <p className="text-zinc-400 pl-5">
                  ทางร้านมุ่งมั่นอัปเดตข้อมูลราคาสินค้า โปรโมชั่น และสต็อกให้ถูกต้องเป็นปัจจุบันที่สุด อย่างไรก็ตาม ราคาสินค้าและโปรโมชั่นอาจมีการเปลี่ยนแปลงตามความผันผวนของตลาดหรือต้นทุนผู้ผลิตโดยไม่ต้องแจ้งให้ทราบล่วงหน้า ขอสงวนสิทธิ์ในการแก้ไขหรือยกเลิกคำสั่งซื้อกรณีราคาแสดงผลผิดพลาดอันเกิดจากความผิดพลาดในการป้อนข้อมูลหรือข้อผิดพลาดทางเทคนิค
                </p>
              </div>

              <div>
                <h3 className="font-bold text-white text-sm mb-1.5 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-amber-400" /> 2. รูปภาพสินค้าและข้อมูลจำเพาะ (Specifications)
                </h3>
                <p className="text-zinc-400 pl-5">
                  รูปภาพ สี ขนาด บรรจุภัณฑ์ และอุปกรณ์ที่ปรากฏในเว็บไซต์ ใช้เพื่อการแสดงตัวอย่างและประกอบการตัดสินใจเบื้องต้น ผลิตภัณฑ์จริงอาจมีความแตกต่างเล็กน้อยตามรอบการผลิตของโรงงานผู้ผลิต
                </p>
              </div>

              <div>
                <h3 className="font-bold text-white text-sm mb-1.5 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-amber-400" /> 3. เครื่องหมายการค้าและทรัพย์สินทางปัญญา
                </h3>
                <p className="text-zinc-400 pl-5">
                  ชื่อแบรนด์ โลโก้ และเครื่องหมายการค้าทั้งหมด (เช่น SATA, ASAHI, PB Swiss Tools, Makita, Bosch, DeWalt, Milwaukee และอื่นๆ) เป็นทรัพย์สินทางปัญญาของเจ้าของเครื่องหมายการค้าแต่ละราย การนำมาแสดงบนเว็บไซต์เพื่อการอ้างอิงและจำหน่ายสินค้าแท้เท่านั้น
                </p>
              </div>

              <div>
                <h3 className="font-bold text-white text-sm mb-1.5 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-amber-400" /> 4. ขั้นตอนการสั่งซื้อและการชำระเงิน
                </h3>
                <p className="text-zinc-400 pl-5">
                  การยืนยันราคาและสรุปคำสั่งซื้อจะกระทำผ่านช่องทางทางการของร้านค้า (LINE Official Account) โดยการออกใบเสนอราคาอย่างเป็นทางการ
                </p>
              </div>
            </div>
          )}

          {activeTab === 'privacy' && (
            <div className="space-y-4">
              <div className="bg-emerald-500/10 border border-emerald-500/30 p-3.5 rounded-xl flex items-start gap-2.5 text-emerald-300 text-xs">
                <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5 text-emerald-400" />
                <span>
                  นโยบายการคุ้มครองข้อมูลส่วนบุคคลตาม พ.ร.บ. คุ้มครองข้อมูลส่วนบุคคล พ.ศ. 2562 (PDPA)
                </span>
              </div>

              <div>
                <h3 className="font-bold text-white text-sm mb-1.5">1. การเก็บรวบรวมข้อมูลส่วนบุคคล</h3>
                <p className="text-zinc-400">
                  เว็บไซต์นี้เปิดให้บุคคลทั่วไปเข้าชมแคตาล็อกสินค้าโดย<strong>ไม่ต้องสมัครสมาชิกหรือระบุข้อมูลส่วนบุคคล</strong> ไม่มีการบันทึกเลขบัตรเครดิต บัญชีธนาคาร หรือข้อมูลส่วนบุคคลใดๆ บนหน้าเว็บสาธารณะ
                </p>
              </div>

              <div>
                <h3 className="font-bold text-white text-sm mb-1.5">2. การใช้งานที่เก็บข้อมูลบนเครื่อง (Local Storage & Cache)</h3>
                <p className="text-zinc-400">
                  ระบบมีการใช้หน่วยความจำภายในเบราว์เซอร์ของท่าน (Local Storage) เพื่อบันทึก<strong>รายการสินค้าที่ท่านกดถูกใจ (Favorites)</strong> และการตั้งค่ามุมมองตารางสินค้า เพื่ออำนวยความสะดวกในการเข้าชมครั้งถัดไป โดยข้อมูลนี้จะอยู่บนอุปกรณ์ของท่านเท่านั้น ไม่ถูกส่งไปยังบุคคลภายนอก
                </p>
              </div>

              <div>
                <h3 className="font-bold text-white text-sm mb-1.5">3. การติดต่อและสั่งซื้อผ่าน LINE Official Account</h3>
                <p className="text-zinc-400">
                  เมื่อท่านกดติดต่อสั่งซื้อหรือขอใบเสนอราคาผ่าน LINE Official ข้อมูลชื่อ ที่อยู่จัดส่ง หรือข้อมูลใบกำกับภาษีที่ท่านมอบให้ จะถูกนำไปใช้เพื่อวัตถุประสงค์ในการออกเอกสารบัญชีและการจัดส่งสินค้าเท่านั้น และได้รับการคุ้มครองความปลอดภัยตามมาตรฐานของแพลตฟอร์ม LINE
                </p>
              </div>

              <div>
                <h3 className="font-bold text-white text-sm mb-1.5">4. สิทธิของเจ้าของข้อมูลส่วนบุคคล</h3>
                <p className="text-zinc-400">
                  ท่านมีสิทธิ์ตามกฎหมาย PDPA ในการขอตรวจสอบ ลบ หรือระงับการใช้ข้อมูลที่เคยแจ้งไว้กับร้านค้า โดยสามารถแจ้งความประสงค์ผ่านเจ้าหน้าที่ทาง LINE Official ได้ตลอดเวลา
                </p>
              </div>
            </div>
          )}

          {activeTab === 'warranty' && (
            <div className="space-y-4">
              <div>
                <h3 className="font-bold text-white text-sm mb-1.5 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-amber-400" /> 1. สินค้าของแท้ 100% และการรับประกัน
                </h3>
                <p className="text-zinc-400 pl-5">
                  สินค้าเครื่องมือช่างและอุปกรณ์ทุกรายการที่จำหน่าย เป็นสินค้าของแท้ 100% จากตัวแทนจำหน่ายอย่างเป็นทางการ สินค้าเครื่องมือไฟฟ้าและไร้สายได้รับการรับประกันศูนย์ตามเงื่อนไขของแต่ละแบรนด์ผู้ผลิต
                </p>
              </div>

              <div>
                <h3 className="font-bold text-white text-sm mb-1.5 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-amber-400" /> 2. การออกใบกำกับภาษีเต็มรูปแบบ
                </h3>
                <p className="text-zinc-400 pl-5">
                  ร้านค้าสามารถออกใบกำกับภาษีเต็มรูปแบบสำหรับบริษัท องค์กร หน่วยงานราชการ และบุคคลธรรมดาได้ โดยโปรดแจ้งชื่อ นิติบุคคล เลขประจำตัวผู้เสียภาษี 13 หลัก และที่อยู่สาขาตอนยืนยันการสั่งซื้อผ่าน LINE
                </p>
              </div>

              <div>
                <h3 className="font-bold text-white text-sm mb-1.5 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-amber-400" /> 3. การจัดส่งสินค้า
                </h3>
                <p className="text-zinc-400 pl-5">
                  จัดส่งรวดเร็วทั่วประเทศผ่านขนส่งเอกชนชั้นนำ (Flash Express, Kerry, ไปรษณีย์ไทย) สำหรับสินค้าขนาดใหญ่หรือสั่งซื้อจำนวนมากสำหรับโรงงาน/ไซส์งาน มีบริการจัดส่งด้วยรถขนส่งหรือขนส่งประจำจังหวัด
                </p>
              </div>

              <div>
                <h3 className="font-bold text-white text-sm mb-1.5 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-amber-400" /> 4. นโยบายการเปลี่ยนสินค้ากรณีชำรุด
                </h3>
                <p className="text-zinc-400 pl-5">
                  หากพบสินค้าชำรุด บกพร่อง หรือไม่ถูกต้องตามคำสั่งซื้อจากการผลิตหรือการขนส่ง กรุณาแจ้งเจ้าหน้าที่พร้อมคลิปวิดีโอตอนแกะกล่องสินค้าภายใน 7 วันหลังจากได้รับสินค้า ทางร้านยินดีประสานงานตรวจสอบและเปลี่ยนชิ้นใหม่ให้ทันที
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer Button */}
        <div className="px-5 py-3 border-t border-zinc-800 bg-zinc-950/60 flex justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-zinc-800 hover:bg-zinc-700 text-white text-xs sm:text-sm font-bold rounded-xl transition-colors cursor-pointer"
          >
            เข้าใจและปิดหน้าต่าง
          </button>
        </div>
      </div>
    </div>
  );
};

