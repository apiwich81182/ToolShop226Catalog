'use client';

import React, { useState } from 'react';
import { Product, QuotationItem } from '@/types/product';
import { formatNumber, isPriceInquiry } from '@/lib/utils';
import {
  X,
  Trash2,
  Plus,
  Minus,
  Printer,
  FileSpreadsheet,
  AlertCircle,
  Building,
  User,
  Phone,
  FileText,
  Check,
  Send,
  ShoppingBag,
} from 'lucide-react';

interface QuotationModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: QuotationItem[];
  onUpdateQuantity: (sku: string, delta: number) => void;
  onRemoveItem: (sku: string) => void;
  onClearAll: () => void;
}

export const QuotationModal: React.FC<QuotationModalProps> = ({
  isOpen,
  onClose,
  items,
  onUpdateQuantity,
  onRemoveItem,
  onClearAll,
}) => {
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [taxId, setTaxId] = useState('');
  const [notes, setNotes] = useState('');
  const [copiedMessage, setCopiedMessage] = useState(false);

  if (!isOpen) return null;

  const totalPieces = items.reduce((sum, item) => sum + item.quantity, 0);
  const totalEstimatedAmount = items.reduce((sum, item) => {
    if (isPriceInquiry(item.product)) return sum;
    return sum + (Number(item.product.final_price) || 0) * item.quantity;
  }, 0);

  const hasInquiryItems = items.some((item) => isPriceInquiry(item.product));

  // Generate clean LINE message
  const generateQuotationLineMessage = () => {
    const lines: string[] = [];
    lines.push('📋 ขอใบเสนอราคา - TOOL SHOP 226 Plus');
    lines.push('===============================');
    if (customerName.trim()) lines.push(`👤 ผู้ติดต่อ: ${customerName.trim()}`);
    if (companyName.trim()) lines.push(`🏢 บริษัท/หน่วยงาน: ${companyName.trim()}`);
    if (customerPhone.trim()) lines.push(`📞 เบอร์ติดต่อ/LINE: ${customerPhone.trim()}`);
    if (taxId.trim()) lines.push(`🆔 เลขผู้เสียภาษี: ${taxId.trim()}`);
    if (notes.trim()) lines.push(`📝 หมายเหตุ/โครงการ: ${notes.trim()}`);
    lines.push('-------------------------------');
    lines.push(`📦 รายการสินค้า (${items.length} รายการ, รวม ${totalPieces} ชิ้น):`);

    items.forEach((item, idx) => {
      const isInquire = isPriceInquiry(item.product);
      const priceStr = isInquire
        ? 'สอบถามราคา'
        : `฿${formatNumber(item.product.final_price * item.quantity)} (฿${formatNumber(item.product.final_price)}/ชิ้น)`;
      lines.push(`${idx + 1}. [${item.product.sku}] ${item.product.brand} - ${item.product.name}`);
      lines.push(`   จำนวน: ${item.quantity} ชิ้น | ${priceStr}`);
    });

    lines.push('-------------------------------');
    if (totalEstimatedAmount > 0) {
      lines.push(`💰 ยอดรวมประมาณการ: ฿${formatNumber(totalEstimatedAmount)} บาท`);
    }
    if (hasInquiryItems) {
      lines.push('* มีรายการที่ราคาขึ้นอยู่กับจำนวนสั่งซื้อ โปรดตรวจสอบกับทางร้าน');
    }
    lines.push('===============================');
    lines.push('รบกวนแจ้งสต็อกสินค้า ค่าจัดส่ง และออกใบเสนอราคาให้ด้วยครับ 🙏');

    return lines.join('\n');
  };

  const handleSendToLine = () => {
    const message = generateQuotationLineMessage();
    const lineOaUrl = process.env.NEXT_PUBLIC_LINE_OA_ID || 'https://lin.ee/ZLqm2Z6';

    try {
      navigator.clipboard.writeText(message);
      setCopiedMessage(true);
      setTimeout(() => setCopiedMessage(false), 3000);
    } catch {
      // fallback
    }

    // Open LINE in new tab
    window.open(lineOaUrl, '_blank', 'noopener,noreferrer');
  };

  const handlePrint = () => {
    window.print();
  };

  const currentDateStr = new Date().toLocaleDateString('th-TH', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const quoteNo = `QT-${Date.now().toString().slice(-6)}`;

  return (
    <>
      {/* ============================================================== */}
      {/* SCREEN MODAL VIEW (HIDDEN DURING PRINT)                         */}
      {/* ============================================================== */}
      <div
        role="dialog"
        aria-modal="true"
        className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-sm animate-in fade-in duration-200 print:hidden"
        onClick={onClose}
      >
        <div
          className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-3xl max-h-[92vh] flex flex-col shadow-2xl text-zinc-100 overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-zinc-800 bg-zinc-950/80 shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-amber-400/10 border border-amber-400/30 flex items-center justify-center text-amber-400">
                <FileSpreadsheet className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-white">รายการขอใบเสนอราคา</h2>
                  <span className="bg-amber-400 text-zinc-950 text-xs font-black px-2 py-0.5 rounded-full">
                    {items.length} รายการ ({totalPieces} ชิ้น)
                  </span>
                </div>
                <p className="text-xs text-zinc-400">TOOL SHOP 226 Plus</p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              {items.length > 0 && (
                <button
                  type="button"
                  onClick={onClearAll}
                  className="text-xs text-zinc-400 hover:text-rose-400 px-2 py-1 rounded hover:bg-zinc-800 transition-colors cursor-pointer mr-1"
                  title="ล้างรายการทั้งหมด"
                >
                  ล้างทั้งหมด
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors cursor-pointer"
                title="ปิด"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Body Content */}
          <div className="p-4 sm:p-6 overflow-y-auto space-y-5 flex-1">
            {items.length === 0 ? (
              <div className="py-12 flex flex-col items-center justify-center text-center text-zinc-500 gap-3">
                <ShoppingBag className="w-12 h-12 stroke-[1.5] text-zinc-600" />
                <p className="text-sm font-semibold text-zinc-300">ยังไม่มีสินค้าในรายการขอราคา</p>
                <p className="text-xs text-zinc-500 max-w-xs">
                  เลือกดูสินค้าในแคตาล็อก แล้วกดปุ่ม &ldquo;+ ขอใบเสนอราคา&rdquo; เพื่อรวมรายการขอใบเสนอราคาในครั้งเดียว
                </p>
                <button
                  type="button"
                  onClick={onClose}
                  className="mt-2 px-4 py-2 bg-amber-400 text-zinc-950 font-bold rounded-xl text-xs hover:bg-amber-300 transition-colors shadow-md"
                >
                  ไปเลือกดูสินค้าในแคตาล็อก
                </button>
              </div>
            ) : (
              <>
                {/* Product Items Table */}
                <div className="space-y-2.5">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                    สินค้าที่เลือกไว้ ({items.length})
                  </h3>
                  <div className="border border-zinc-800 rounded-xl overflow-hidden divide-y divide-zinc-800 bg-zinc-950/40">
                    {items.map(({ product, quantity }) => {
                      const isInquire = isPriceInquiry(product);
                      const lineTotal = isInquire ? 0 : product.final_price * quantity;

                      return (
                        <div
                          key={product.sku}
                          className="p-3 sm:p-3.5 flex items-center justify-between gap-3 hover:bg-zinc-900/60 transition-colors"
                        >
                          {/* Image & Title */}
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            <div className="w-11 h-11 rounded-lg bg-zinc-900 border border-zinc-800 overflow-hidden shrink-0 flex items-center justify-center">
                              {product.image_url ? (
                                <img
                                  src={product.image_url}
                                  alt={product.name}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <span className="text-[10px] text-zinc-600 font-bold">NO IMG</span>
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-[11px] font-bold text-amber-400 bg-amber-400/10 px-1.5 py-0.5 rounded border border-amber-400/20">
                                  {product.brand}
                                </span>
                                <span className="text-xs font-mono text-zinc-400">
                                  {product.sku}
                                </span>
                              </div>
                              <h4 className="text-xs sm:text-sm font-semibold text-zinc-100 truncate mt-0.5">
                                {product.name}
                              </h4>
                              <div className="text-[11px] text-zinc-400 mt-0.5">
                                {isInquire ? (
                                  <span className="text-rose-400 font-bold">ติดต่อสอบถามราคา</span>
                                ) : (
                                  <span>฿{formatNumber(product.final_price)} / ชิ้น</span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Quantity stepper & Line Total */}
                          <div className="flex items-center gap-3 shrink-0">
                            {/* Quantity Stepper */}
                            <div className="flex items-center border border-zinc-700 bg-zinc-900 rounded-lg overflow-hidden">
                              <button
                                type="button"
                                onClick={() => onUpdateQuantity(product.sku, -1)}
                                className="p-1.5 hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
                                title="ลดจำนวน"
                              >
                                <Minus className="w-3 h-3" />
                              </button>
                              <span className="w-7 text-center text-xs font-bold text-zinc-100">
                                {quantity}
                              </span>
                              <button
                                type="button"
                                onClick={() => onUpdateQuantity(product.sku, 1)}
                                className="p-1.5 hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
                                title="เพิ่มจำนวน"
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                            </div>

                            {/* Line Total */}
                            <div className="w-20 sm:w-24 text-right">
                              {isInquire ? (
                                <span className="text-xs font-bold text-rose-400">สอบถาม</span>
                              ) : (
                                <span className="text-xs sm:text-sm font-bold text-amber-400">
                                  ฿{formatNumber(lineTotal)}
                                </span>
                              )}
                            </div>

                            {/* Delete button */}
                            <button
                              type="button"
                              onClick={() => onRemoveItem(product.sku)}
                              className="p-1.5 text-zinc-500 hover:text-rose-400 hover:bg-zinc-800 rounded-lg transition-colors"
                              title="ลบออกจากรายการ"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Customer Information (Optional) */}
                <div className="bg-zinc-950/60 border border-zinc-800/80 rounded-xl p-4 space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-amber-400" />
                    ข้อมูลผู้ติดต่อ / บริษัท (สำหรับลงในใบเสนอราคา - ไม่บังคับ)
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-zinc-400 mb-1">
                        ชื่อผู้ติดต่อ
                      </label>
                      <input
                        type="text"
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        placeholder="เช่น ช่างสมชาย, คุณวรรณา"
                        className="w-full px-3 py-1.5 text-xs bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-100 placeholder-zinc-600 focus:border-amber-400 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-zinc-400 mb-1">
                        เบอร์ติดต่อ หรือ LINE ID
                      </label>
                      <input
                        type="text"
                        value={customerPhone}
                        onChange={(e) => setCustomerPhone(e.target.value)}
                        placeholder="เช่น 081-234-5678"
                        className="w-full px-3 py-1.5 text-xs bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-100 placeholder-zinc-600 focus:border-amber-400 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-zinc-400 mb-1">
                        ชื่อบริษัท / หน่วยงาน
                      </label>
                      <input
                        type="text"
                        value={companyName}
                        onChange={(e) => setCompanyName(e.target.value)}
                        placeholder="เช่น บจก. ก่อสร้างมั่นคง"
                        className="w-full px-3 py-1.5 text-xs bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-100 placeholder-zinc-600 focus:border-amber-400 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-zinc-400 mb-1">
                        เลขประจำตัวผู้เสียภาษี (13 หลัก)
                      </label>
                      <input
                        type="text"
                        value={taxId}
                        onChange={(e) => setTaxId(e.target.value)}
                        placeholder="สำหรับเปิดใบกำกับภาษี"
                        className="w-full px-3 py-1.5 text-xs bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-100 placeholder-zinc-600 focus:border-amber-400 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Subtotal summary banner */}
                <div className="bg-amber-400/10 border border-amber-400/30 rounded-xl p-3.5 flex items-center justify-between">
                  <div>
                    <span className="text-xs text-zinc-400 block">ยอดรวมประมาณการ ({totalPieces} ชิ้น)</span>
                    <span className="text-xl sm:text-2xl font-black text-amber-400">
                      ฿{formatNumber(totalEstimatedAmount)}
                    </span>
                    {hasInquiryItems && (
                      <span className="text-[11px] text-rose-400 block mt-0.5">
                        * รวมเฉพาะรายการที่มีระบุราคา (มีบางรายการต้องเช็กราคาทาง LINE)
                      </span>
                    )}
                  </div>
                  <div className="text-right text-[11px] text-zinc-400">
                    <span>ออกใบกำกับภาษีได้ 100%</span>
                    <span className="block text-zinc-500">ราคายังไม่รวมค่าจัดส่ง</span>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Action Footer */}
          {items.length > 0 && (
            <div className="px-5 py-3.5 border-t border-zinc-800 bg-zinc-950/80 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
              <div className="text-xs text-zinc-400 text-center sm:text-left">
                {copiedMessage ? (
                  <span className="text-emerald-400 font-bold flex items-center gap-1">
                    <Check className="w-3.5 h-3.5" /> คัดลอกรายการข้อความเรียบร้อยแล้ว!
                  </span>
                ) : (
                  <span>กดส่งเข้า LINE หรือกดพิมพ์เอกสารเพื่อเสนอฝ่ายจัดซื้อ</span>
                )}
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                {/* Print PDF Button */}
                <button
                  type="button"
                  onClick={handlePrint}
                  className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl border border-zinc-700 bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-sm"
                  title="พิมพ์ หรือบันทึกเป็น PDF"
                >
                  <Printer className="w-4 h-4 text-amber-400" />
                  <span>พิมพ์ / บันทึก PDF</span>
                </button>

                {/* Send LINE Button */}
                <button
                  type="button"
                  onClick={handleSendToLine}
                  className="flex-1 sm:flex-none px-5 py-2.5 rounded-xl bg-[#06C755] hover:bg-[#05b34c] text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg transition-transform active:scale-95 cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                  <span>ส่งรายการเข้า LINE</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ============================================================== */}
      {/* PRINT-ONLY FORMAL QUOTATION SHEET (VISIBLE ONLY WHEN PRINTING) */}
      {/* ============================================================== */}
      <div className="hidden print:block fixed inset-0 bg-white text-black p-8 font-sans z-[999999] overflow-visible">
        {/* Print Header */}
        <div className="flex justify-between items-start border-b-2 border-zinc-800 pb-4 mb-6">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-zinc-900">TOOL SHOP 226 Plus</h1>
            <p className="text-xs text-zinc-600 mt-0.5">
              ศูนย์รวมเครื่องมือช่างและอุปกรณ์ฮาร์ดแวร์ครบวงจร ราคาส่ง พร้อมส่งทั่วประเทศ
            </p>
            <p className="text-xs text-zinc-600">
              ติดต่อ: LINE @hardwaretoolsth | เว็บไซต์: toolshop226catalog.com
            </p>
          </div>
          <div className="text-right">
            <span className="inline-block bg-zinc-900 text-white font-bold px-3 py-1 text-sm rounded">
              ใบขอเสนอราคา / RFQ
            </span>
            <p className="text-xs text-zinc-600 mt-1.5">เลขที่: {quoteNo}</p>
            <p className="text-xs text-zinc-600">วันที่: {currentDateStr}</p>
          </div>
        </div>

        {/* Customer Info Box */}
        {(customerName || companyName || customerPhone || taxId) && (
          <div className="border border-zinc-300 rounded p-3 mb-6 bg-zinc-50 text-xs grid grid-cols-2 gap-2">
            <div>
              <span className="font-bold">เรียน / ผู้ติดต่อ: </span>
              <span>{customerName || '-'}</span>
            </div>
            <div>
              <span className="font-bold">เบอร์โทร / LINE: </span>
              <span>{customerPhone || '-'}</span>
            </div>
            <div>
              <span className="font-bold">บริษัท / หน่วยงาน: </span>
              <span>{companyName || '-'}</span>
            </div>
            <div>
              <span className="font-bold">เลขผู้เสียภาษี: </span>
              <span>{taxId || '-'}</span>
            </div>
          </div>
        )}

        {/* Printable Items Table */}
        <table className="w-full text-xs border-collapse border border-zinc-300 mb-6">
          <thead>
            <tr className="bg-zinc-100 text-zinc-800">
              <th className="border border-zinc-300 px-2 py-2 text-center w-10">ลำดับ</th>
              <th className="border border-zinc-300 px-3 py-2 text-left w-28">รหัส (SKU)</th>
              <th className="border border-zinc-300 px-3 py-2 text-left">รายการสินค้า</th>
              <th className="border border-zinc-300 px-2 py-2 text-center w-20">ยี่ห้อ</th>
              <th className="border border-zinc-300 px-2 py-2 text-center w-16">จำนวน</th>
              <th className="border border-zinc-300 px-3 py-2 text-right w-24">ราคา/หน่วย</th>
              <th className="border border-zinc-300 px-3 py-2 text-right w-28">รวมเป็นเงิน</th>
            </tr>
          </thead>
          <tbody>
            {items.map(({ product, quantity }, idx) => {
              const isInquire = isPriceInquiry(product);
              const lineTotal = isInquire ? 0 : product.final_price * quantity;

              return (
                <tr key={product.sku} className="hover:bg-zinc-50">
                  <td className="border border-zinc-300 px-2 py-2 text-center">{idx + 1}</td>
                  <td className="border border-zinc-300 px-3 py-2 font-mono font-bold text-zinc-700">
                    {product.sku}
                  </td>
                  <td className="border border-zinc-300 px-3 py-2 font-medium">
                    {product.name}
                  </td>
                  <td className="border border-zinc-300 px-2 py-2 text-center font-bold">
                    {product.brand}
                  </td>
                  <td className="border border-zinc-300 px-2 py-2 text-center font-bold">
                    {quantity}
                  </td>
                  <td className="border border-zinc-300 px-3 py-2 text-right">
                    {isInquire ? 'สอบถาม' : `฿${formatNumber(product.final_price)}`}
                  </td>
                  <td className="border border-zinc-300 px-3 py-2 text-right font-bold">
                    {isInquire ? 'สอบถาม' : `฿${formatNumber(lineTotal)}`}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="bg-zinc-100 font-bold">
              <td colSpan={4} className="border border-zinc-300 px-3 py-2 text-right">
                รวมทั้งสิ้น ({totalPieces} ชิ้น):
              </td>
              <td className="border border-zinc-300 px-2 py-2 text-center">{totalPieces}</td>
              <td className="border border-zinc-300 px-3 py-2 text-right">-</td>
              <td className="border border-zinc-300 px-3 py-2 text-right text-sm">
                ฿{formatNumber(totalEstimatedAmount)}
              </td>
            </tr>
          </tfoot>
        </table>

        {/* Remarks & Signatures */}
        <div className="text-[11px] text-zinc-600 space-y-1 mb-8">
          <p>• ราคานี้เป็นราคาประมาณการเบื้องต้น อาจมีส่วนลดเพิ่มเติมตามปริมาณการสั่งซื้อ</p>
          <p>• ราคาสินค้าสามารถออกใบกำกับภาษีเต็มรูปแบบได้ (ราคายังไม่รวมค่าบริการจัดส่ง)</p>
          <p>• สินค้าทุกชิ้นเป็นของแท้ 100% มีการรับประกันตามมาตรฐานศูนย์ผู้ผลิต</p>
        </div>

        <div className="grid grid-cols-2 gap-12 pt-8 text-xs text-center">
          <div>
            <div className="border-b border-zinc-400 w-48 mx-auto mb-2" />
            <p className="font-bold text-zinc-800">ผู้ขอใบเสนอราคา / ผู้สั่งซื้อ</p>
            <p className="text-zinc-500 text-[10px]">วันที่ ...../...../..........</p>
          </div>
          <div>
            <div className="border-b border-zinc-400 w-48 mx-auto mb-2" />
            <p className="font-bold text-zinc-800">TOOL SHOP 226 Plus</p>
            <p className="text-zinc-500 text-[10px]">ผู้รับรายการ / เจ้าหน้าที่ฝ่ายขาย</p>
          </div>
        </div>
      </div>
    </>
  );
};
