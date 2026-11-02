'use client';

import React, { useState } from 'react';
import {
  X,
  FileSpreadsheet,
  Images,
  SlidersHorizontal,
  Plus,
  HelpCircle,
  Download,
  Upload,
  CheckCircle2,
  AlertTriangle,
  Zap,
  ArrowRight,
  Sparkles,
} from 'lucide-react';

interface AdminGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AdminGuideModal: React.FC<AdminGuideModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'excel' | 'images' | 'manual' | 'workflow'>('workflow');

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl relative text-zinc-100 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800 bg-zinc-950/80">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-400/10 border border-amber-400/30 flex items-center justify-center text-amber-400">
              <HelpCircle className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                วิธีใช้งานแถบเครื่องมือหลังบ้าน (Admin Guide)
              </h2>
              <p className="text-[11px] text-zinc-400">
                คู่มือสรุปวิธีจัดการสินค้า Excel, อัปโหลดรูปภาพชุด และตั้งค่าระบบ
              </p>
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

        {/* Tab Buttons */}
        <div className="flex items-center gap-1 px-4 py-2 bg-zinc-950 border-b border-zinc-850 overflow-x-auto no-scrollbar text-xs">
          <button
            type="button"
            onClick={() => setActiveTab('workflow')}
            className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 whitespace-nowrap transition-all cursor-pointer ${
              activeTab === 'workflow'
                ? 'bg-amber-400 text-zinc-950 shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-850'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>ขั้นตอนด่วน 3 สเต็ป</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('excel')}
            className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 whitespace-nowrap transition-all cursor-pointer ${
              activeTab === 'excel'
                ? 'bg-amber-400 text-zinc-950 shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-850'
            }`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>จัดการผ่าน Excel</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('images')}
            className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 whitespace-nowrap transition-all cursor-pointer ${
              activeTab === 'images'
                ? 'bg-amber-400 text-zinc-950 shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-850'
            }`}
          >
            <Images className="w-3.5 h-3.5" />
            <span>อัปโหลดรูปชุดตาม SKU</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('manual')}
            className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 whitespace-nowrap transition-all cursor-pointer ${
              activeTab === 'manual'
                ? 'bg-amber-400 text-zinc-950 shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-850'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>แบรนด์ & เพิ่มรายชิ้น</span>
          </button>
        </div>

        {/* Tab Content Area */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs sm:text-sm leading-relaxed text-zinc-300">
          {/* ========================================================= */}
          {/* TAB 1: WORKFLOW                                          */}
          {/* ========================================================= */}
          {activeTab === 'workflow' && (
            <div className="space-y-4">
              <div className="bg-amber-400/10 border border-amber-400/30 rounded-xl p-3.5 text-amber-200 text-xs flex items-start gap-2.5">
                <Sparkles className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-amber-400 font-bold block mb-0.5">สูตรลัดลงสินค้า 50-100 ชิ้น ในเวลาไม่ถึง 3 นาที</strong>
                  ใช้วิธีนำเข้าข้อมูลตัวอักษรผ่าน Excel ก่อน แล้วค่อยอัปโหลดรูปทั้งหมดตามทีหลัง ระบบจะจับคู่ให้เองอัตโนมัติ!
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {/* Step 1 */}
                <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-3.5 flex flex-col justify-between">
                  <div>
                    <div className="w-6 h-6 rounded-full bg-amber-400 text-zinc-950 font-black text-xs flex items-center justify-center mb-2">
                      1
                    </div>
                    <h3 className="font-bold text-white text-xs sm:text-sm mb-1 flex items-center gap-1">
                      <Download className="w-3.5 h-3.5 text-zinc-400" /> โหลดเทมเพลต & กรอก
                    </h3>
                    <p className="text-[11px] text-zinc-400">
                      กดปุ่ม <strong>&quot;โหลดเทมเพลต&quot;</strong> จะได้ไฟล์ Excel เปล่า กรอก SKU, ชื่อ, ยี่ห้อ, ราคา (คอลัมน์รูปเว้นว่างไว้ได้)
                    </p>
                  </div>
                  <div className="mt-3 pt-2 border-t border-zinc-850 text-[10px] text-zinc-500">
                    *ห้ามเปลี่ยนชื่อหัวคอลัมน์
                  </div>
                </div>

                {/* Step 2 */}
                <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-3.5 flex flex-col justify-between">
                  <div>
                    <div className="w-6 h-6 rounded-full bg-emerald-500 text-white font-black text-xs flex items-center justify-center mb-2">
                      2
                    </div>
                    <h3 className="font-bold text-white text-xs sm:text-sm mb-1 flex items-center gap-1">
                      <Upload className="w-3.5 h-3.5 text-emerald-400" /> นำเข้า Import Excel
                    </h3>
                    <p className="text-[11px] text-zinc-400">
                      กดปุ่ม <strong>&quot;Import Excel&quot;</strong> แนบไฟล์ที่กรอกเสร็จ ข้อมูลสินค้าและราคาจะเข้าระบบทันที
                    </p>
                  </div>
                  <div className="mt-3 pt-2 border-t border-zinc-850 text-[10px] text-emerald-400/80">
                    *สินค้าเดิมระบบจะอัปเดตราคาให้
                  </div>
                </div>

                {/* Step 3 */}
                <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-3.5 flex flex-col justify-between">
                  <div>
                    <div className="w-6 h-6 rounded-full bg-purple-500 text-white font-black text-xs flex items-center justify-center mb-2">
                      3
                    </div>
                    <h3 className="font-bold text-white text-xs sm:text-sm mb-1 flex items-center gap-1">
                      <Images className="w-3.5 h-3.5 text-purple-400" /> อัปโหลดรูปชุดตาม SKU
                    </h3>
                    <p className="text-[11px] text-zinc-400">
                      ตั้งชื่อรูปเป็นรหัสสินค้า เช่น <code className="text-amber-400 font-mono">SATA-09014.jpg</code> แล้วกด <strong>&quot;อัปโหลดรูปชุด&quot;</strong> เลือกทีเดียว 50 รูป!
                    </p>
                  </div>
                  <div className="mt-3 pt-2 border-t border-zinc-850 text-[10px] text-purple-400/80">
                    *ระบบจับคู่รูปเข้ากับสินค้าอัตโนมัติ
                  </div>
                </div>
              </div>

              {/* Monthly Price Update */}
              <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-3.5">
                <h4 className="font-bold text-white text-xs mb-1 flex items-center gap-1.5">
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" /> วิธีปรับราคาหรือโปรโมชั่นยกแผงประจำเดือน
                </h4>
                <p className="text-xs text-zinc-400">
                  กดปุ่ม <strong>&quot;Export&quot;</strong> ➔ แก้ไขราคาในไฟล์ Excel ➔ กดปุ่ม <strong>&quot;Import Excel&quot;</strong> ไฟล์เดิมกลับเข้ามา ข้อมูลราคาจะเปลี่ยนใหม่ทันทีโดยรูปภาพไม่หาย!
                </p>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* TAB 2: EXCEL MANAGEMENT                                   */}
          {/* ========================================================= */}
          {activeTab === 'excel' && (
            <div className="space-y-4">
              <div>
                <h3 className="font-bold text-white text-sm mb-1">
                  1. โครงสร้าง 6 คอลัมน์มาตรฐานในไฟล์ Excel
                </h3>
                <p className="text-xs text-zinc-400 mb-2">
                  ไฟล์ที่ Import ต้องมีหัวตารางแถวที่ 1 ตรงตามนี้ทุกตัวอักษร:
                </p>
                <div className="overflow-x-auto border border-zinc-800 rounded-xl">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-zinc-950 text-zinc-400 border-b border-zinc-800 font-semibold">
                      <tr>
                        <th className="py-2 px-3">ชื่อคอลัมน์</th>
                        <th className="py-2 px-3">ความจำเป็น</th>
                        <th className="py-2 px-3">ตัวอย่างข้อมูล</th>
                        <th className="py-2 px-3">คำอธิบาย</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-850 font-mono text-[11px]">
                      <tr>
                        <td className="py-2 px-3 text-amber-400 font-bold">sku</td>
                        <td className="py-2 px-3 text-rose-400">ต้องมี</td>
                        <td className="py-2 px-3 text-zinc-300">SATA-09014</td>
                        <td className="py-2 px-3 font-sans text-zinc-400">รหัสสินค้า ห้ามเว้นว่าง ห้ามซ้ำ</td>
                      </tr>
                      <tr>
                        <td className="py-2 px-3 text-amber-400 font-bold">name</td>
                        <td className="py-2 px-3 text-rose-400">ต้องมี</td>
                        <td className="py-2 px-3 text-zinc-300">ชุดประแจรวม 14 ชิ้น</td>
                        <td className="py-2 px-3 font-sans text-zinc-400">ชื่อสินค้าภาษาไทยหรืออังกฤษ</td>
                      </tr>
                      <tr>
                        <td className="py-2 px-3 text-zinc-300">brand</td>
                        <td className="py-2 px-3 text-zinc-500">ควรมี</td>
                        <td className="py-2 px-3 text-zinc-300">SATA</td>
                        <td className="py-2 px-3 font-sans text-zinc-400">ยี่ห้อ (ถ้าเป็นยี่ห้อใหม่ระบบจะบันทึกเพิ่มให้)</td>
                      </tr>
                      <tr>
                        <td className="py-2 px-3 text-zinc-300">base_price</td>
                        <td className="py-2 px-3 text-zinc-500">ไม่บังคับ</td>
                        <td className="py-2 px-3 text-zinc-300">1850 หรือ สอบถาม</td>
                        <td className="py-2 px-3 font-sans text-zinc-400">ราคาเต็มป้าย (ถ้าไม่ระบุใส่ 0 หรือ สอบถาม)</td>
                      </tr>
                      <tr>
                        <td className="py-2 px-3 text-zinc-300">new_price</td>
                        <td className="py-2 px-3 text-zinc-500">ไม่บังคับ</td>
                        <td className="py-2 px-3 text-zinc-300">1490 หรือ สอบถาม</td>
                        <td className="py-2 px-3 font-sans text-zinc-400">ราคาขายจริง (ระบบจะคำนวณส่วนลดให้เอง)</td>
                      </tr>
                      <tr>
                        <td className="py-2 px-3 text-zinc-300">image_url</td>
                        <td className="py-2 px-3 text-zinc-500">เว้นว่างได้</td>
                        <td className="py-2 px-3 text-zinc-500">https://...</td>
                        <td className="py-2 px-3 font-sans text-zinc-400">ลิงก์รูป (ถ้าไม่มีรูปเว้นว่างไว้ แล้วใช้อัปโหลดรูปชุดแทน)</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="bg-zinc-950 p-3 rounded-xl border border-zinc-800">
                  <div className="font-bold text-emerald-400 flex items-center gap-1.5 mb-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> ระบบ Upsert อัจฉริยะ
                  </div>
                  <p className="text-[11px] text-zinc-400">
                    - หากเป็น SKU ใหม่ ➔ ระบบจะ <strong>เพิ่มสินค้าใหม่</strong><br/>
                    - หากเป็น SKU เดิมที่มีอยู่ ➔ ระบบจะ <strong>อัปเดตราคาและชื่อให้ทันที</strong> ไม่เกิดข้อมูลซ้ำซ้อน
                  </p>
                </div>
                <div className="bg-zinc-950 p-3 rounded-xl border border-zinc-800">
                  <div className="font-bold text-amber-400 flex items-center gap-1.5 mb-1">
                    <AlertTriangle className="w-3.5 h-3.5" /> ข้อควรระวัง
                  </div>
                  <p className="text-[11px] text-zinc-400">
                    - แนะนำให้กดปุ่ม <strong>&quot;โหลดเทมเพลต&quot;</strong> เพื่อเริ่มกรอก<br/>
                    - อย่าพิมพ์สัญลักษณ์ ฿ หรือเครื่องหมายจุลภาค (,) ลงในช่องราคา ให้ใส่เฉพาะตัวเลขล้วน
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* TAB 3: BATCH IMAGES                                       */}
          {/* ========================================================= */}
          {activeTab === 'images' && (
            <div className="space-y-4">
              <div className="bg-purple-950/30 border border-purple-800/50 rounded-xl p-4">
                <h3 className="font-bold text-purple-300 text-sm mb-1 flex items-center gap-2">
                  <Images className="w-4 h-4 text-purple-400" /> กฎเหล็ก: การตั้งชื่อไฟล์รูปภาพให้ตรงกับ SKU
                </h3>
                <p className="text-xs text-zinc-300">
                  ระบบจะใช้ <strong>&quot;ชื่อไฟล์รูปภาพ&quot;</strong> ไปจับคู่กับ <strong>&quot;รหัสสินค้า (SKU)&quot;</strong> ในระบบโดยอัตโนมัติ ดังนั้นก่อนอัปโหลด ให้ตั้งชื่อไฟล์รูปตามรหัสสินค้า:
                </p>
                <div className="mt-3 bg-zinc-950 p-3 rounded-lg border border-purple-900/60 font-mono text-xs space-y-1.5">
                  <div className="flex items-center justify-between text-zinc-300">
                    <span>รหัสสินค้า (SKU): <strong className="text-amber-400">SATA-09014</strong></span>
                    <span className="text-zinc-500">➔</span>
                    <span>ชื่อไฟล์รูป: <strong className="text-emerald-400">SATA-09014.jpg</strong></span>
                  </div>
                  <div className="flex items-center justify-between text-zinc-300">
                    <span>รหัสสินค้า (SKU): <strong className="text-amber-400">AQUS710</strong></span>
                    <span className="text-zinc-500">➔</span>
                    <span>ชื่อไฟล์รูป: <strong className="text-emerald-400">AQUS710.png</strong></span>
                  </div>
                  <div className="flex items-center justify-between text-zinc-300">
                    <span>รหัสสินค้า (SKU): <strong className="text-amber-400">MKT-DF333DWYE</strong></span>
                    <span className="text-zinc-500">➔</span>
                    <span>ชื่อไฟล์รูป: <strong className="text-emerald-400">MKT-DF333DWYE.webp</strong></span>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-bold text-white text-xs mb-1.5">ขั้นตอนการอัปโหลด:</h4>
                <ol className="list-decimal list-inside space-y-1.5 text-xs text-zinc-400">
                  <li>รวมไฟล์รูปภาพทั้งหมดไว้ในโฟลเดอร์เดียวกันในเครื่อง</li>
                  <li>คลิกปุ่มสีม่วง <strong>&quot;อัปโหลดรูปชุด&quot;</strong> บนแถบเมนู</li>
                  <li>กด <kbd className="px-1.5 py-0.5 bg-zinc-800 rounded text-zinc-300">Ctrl</kbd> + <kbd className="px-1.5 py-0.5 bg-zinc-800 rounded text-zinc-300">A</kbd> เพื่อเลือกรูปภาพทั้งหมดพร้อมกัน แล้วกด Open</li>
                  <li>ระบบจะทำการอัปโหลดขึ้น Cloud Storage และผูก URL ให้สินค้าที่ตรงกับ SKU ทุกชิ้นโดยอัตโนมัติ</li>
                </ol>
              </div>

              <div className="text-[11px] text-zinc-500 bg-zinc-950 p-2.5 rounded-lg border border-zinc-850">
                💡 <strong>เคล็ดลับ:</strong> รองรับไฟล์นามสกุล <code className="text-zinc-300">.jpg</code>, <code className="text-zinc-300">.jpeg</code>, <code className="text-zinc-300">.png</code>, <code className="text-zinc-300">.webp</code> (ตัวพิมพ์เล็กหรือใหญ่ก็สามารถจับคู่ได้)
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* TAB 4: MANUAL ENTRY & BRANDS                              */}
          {/* ========================================================= */}
          {activeTab === 'manual' && (
            <div className="space-y-4">
              {/* Brand Management */}
              <div className="bg-zinc-950 p-3.5 rounded-xl border border-zinc-800">
                <h3 className="font-bold text-white text-xs sm:text-sm mb-1 flex items-center gap-2">
                  <SlidersHorizontal className="w-4 h-4 text-amber-400" /> 1. การจัดการยี่ห้อ (Brand Management)
                </h3>
                <p className="text-xs text-zinc-400 mb-2">
                  คลิกปุ่ม <strong>&quot;จัดการยี่ห้อ&quot;</strong> เพื่อเพิ่มหรือลบรายชื่อยี่ห้อสินค้า:
                </p>
                <ul className="list-disc list-inside text-xs text-zinc-400 space-y-1">
                  <li>พิมพ์ชื่อแบรนด์ใหม่ เช่น <code>Wera</code>, <code>KNIPEX</code> แล้วกดเพิ่ม</li>
                  <li>รายชื่อยี่ห้อจะถูกจัดเรียงตามลำดับตัวอักษร <strong>A-Z</strong> เสมอ</li>
                  <li>ยี่ห้อนี้จะไปแสดงในตัวกรองหน้าร้านและตัวเลือกในฟอร์มทันที</li>
                </ul>
              </div>

              {/* Single Product Add */}
              <div className="bg-zinc-950 p-3.5 rounded-xl border border-zinc-800">
                <h3 className="font-bold text-white text-xs sm:text-sm mb-1 flex items-center gap-2">
                  <Plus className="w-4 h-4 text-amber-400" /> 2. การเพิ่มสินค้าใหม่ทีละชิ้น (+ เพิ่มสินค้าใหม่)
                </h3>
                <p className="text-xs text-zinc-400 mb-2">
                  เหมาะสำหรับการลงสินค้าด่วน 1-2 รายการ:
                </p>
                <div className="space-y-2 text-xs text-zinc-400">
                  <div>
                    <strong className="text-zinc-200">โหมดการตั้งราคา 4 รูปแบบ:</strong>
                    <ul className="list-disc list-inside pl-2 space-y-0.5 mt-1">
                      <li><strong>ตั้งราคาขายใหม่</strong>: ใส่ราคาเต็ม + ราคาขายจริง ➔ ระบบคำนวณส่วนลด ฿ และ % ให้เอง</li>
                      <li><strong>ส่วนลด (฿)</strong>: ใส่ราคาเต็ม + ส่วนลดเป็นบาท ➔ ระบบคิดราคาขายใหม่ให้</li>
                      <li><strong>ส่วนลด (%)</strong>: ใส่ราคาเต็ม + เปอร์เซ็นต์ส่วนลด ➔ ระบบคิดยอดลดให้อัตโนมัติ</li>
                      <li><strong>ติดต่อสอบถามราคา</strong>: หน้าร้านจะแสดงปุ่ม &quot;สอบถามราคา&quot; นำไปยัง LINE OA ทันที</li>
                    </ul>
                  </div>
                  <div className="pt-1">
                    <strong className="text-zinc-200">รูปภาพสินค้า:</strong> สามารถลากไฟล์รูปภาพมาวาง (Drag & Drop) หรือเลือกจากเครื่องได้ทันที
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-zinc-800 bg-zinc-950 flex items-center justify-between text-xs">
          <span className="text-zinc-500">
            TOOL SHOP 226 PLUS • Admin SOP Guide
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-amber-400 hover:bg-amber-300 text-zinc-950 font-bold rounded-lg transition-colors cursor-pointer"
          >
            เข้าใจแล้ว ปิดหน้าต่าง
          </button>
        </div>
      </div>
    </div>
  );
};

