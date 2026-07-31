"use client";

import { memo } from "react";

interface ReceiptFooterProps {
  tripIdShort: string;
}

const BARCODE_PATTERNS = [
  [2, 1, 2, 2, 2, 2],
  [2, 2, 2, 1, 2, 2],
  [2, 2, 2, 2, 2, 1],
  [1, 2, 1, 2, 2, 3],
  [1, 2, 1, 3, 2, 2],
  [1, 3, 1, 2, 2, 2],
  [1, 2, 2, 2, 1, 3],
  [1, 2, 2, 3, 1, 2],
  [1, 3, 2, 2, 1, 2],
  [2, 2, 1, 2, 1, 3],
  [2, 2, 1, 3, 1, 2],
  [2, 3, 1, 2, 1, 2],
  [1, 1, 2, 2, 3, 2],
  [1, 2, 2, 1, 3, 2],
  [1, 2, 2, 2, 3, 1],
  [1, 1, 3, 2, 2, 2],
] as const;

function getBarcodeModules(value: string) {
  const modules = [2, 1, 1, 2, 1, 4];

  for (const character of value) {
    const patternIndex = Number.parseInt(character, 16);
    modules.push(...BARCODE_PATTERNS[Number.isNaN(patternIndex) ? 0 : patternIndex]!);
  }

  modules.push(2, 3, 3, 1, 1, 1, 2);
  return modules;
}

export const ReceiptFooter = memo(function ReceiptFooter({ tripIdShort }: ReceiptFooterProps) {
  const barcodeValue = `${tripIdShort}0001`;
  const barcodeModules = getBarcodeModules(tripIdShort);

  return (
    <footer className="border-receipt-line mt-6 border-t border-dashed pt-4 text-center uppercase">
      <p className="text-receipt-ink text-[10px] font-bold tracking-wider">
        Dziękujemy za wspólne wydawanie
      </p>
      <p className="text-receipt-muted mt-1 text-[10px] font-semibold">
        Reklamacji nie przyjmujemy :)
      </p>
      <div className="mx-auto mt-5 flex h-20 w-[84%] items-stretch" aria-hidden="true">
        {barcodeModules.map((width, index) => (
          <span
            key={index}
            className={index % 2 === 0 ? "bg-receipt-ink block" : "block bg-transparent"}
            style={{ flexBasis: 0, flexGrow: width }}
          />
        ))}
      </div>
      <p className="text-receipt-ink mt-1 text-[9px] tracking-[0.25em]">{barcodeValue}</p>
    </footer>
  );
});
