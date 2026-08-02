import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "밥조사 - 반별 식사 주문 취합",
  description: "직종별 카카오톡 주문 평문을 붙여넣으면 메뉴와 수량을 자동 인식하고 합산합니다.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className="h-full antialiased dark">
      <body className="min-h-full flex flex-col bg-bg-primary text-text-primary">
        {children}
      </body>
    </html>
  );
}
