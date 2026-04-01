"use client";

import Link from "next/link";

export default function Breadcrumb({ items }) {
  return (
    <div className="breadcrumb-wrap">
      <nav className="breadcrumb">
        {items.map((item, index) => (
          <span key={item.label}>
            {item.href ? <Link href={item.href}>{item.label}</Link> : item.label}
            {index !== items.length - 1 ? " / " : ""}
          </span>
        ))}
      </nav>
    </div>
  );
}
