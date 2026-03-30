"use client";

import {
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { ChevronLeft, ChevronRight, ExternalLink } from "lucide-react";

export default function ProductTable({ data, pagination, onPageChange }) {
  const columns = [
    {
      accessorKey: "images",
      header: "Image",
      cell: ({ getValue }) => (
        <div className="w-12 h-12 rounded border overflow-hidden bg-zinc-50">
          {getValue()?.[0]?.url ? (
            <img src={getValue()[0].url} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-zinc-200" />
          )}
        </div>
      ),
    },
    {
      accessorKey: "title",
      header: "Product",
      cell: ({ row }) => (
        <div className="flex flex-col">
          <span className="font-medium text-zinc-900 dark:text-zinc-50">{row.original.title}</span>
          <span className="text-xs text-zinc-500">{row.original.vendor}</span>
        </div>
      ),
    },
    {
      accessorKey: "type",
      header: "Category",
    },
    {
      accessorKey: "variants",
      header: "Stock",
      cell: ({ getValue }) => {
        const variants = getValue() || [];
        const total = variants.reduce((acc, v) => acc + (v.inventory || 0), 0);
        return <span className="text-sm">{total} units ({variants.length} vars)</span>;
      },
    },
    {
      accessorKey: "handle",
      header: "View",
      cell: ({ getValue }) => (
        <a
          href={`/products/${getValue()}`}
          className="p-2 hover:bg-zinc-100 rounded-lg inline-block transition-colors"
          title="View Product Details"
        >
          <ExternalLink size={16} className="text-zinc-400" />
        </a>
      ),
    },
  ];

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-800">
        <table className="w-full text-left text-sm">
          <thead className="bg-zinc-50 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 text-zinc-500 font-medium">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th key={header.id} className="px-4 py-3">
                    {flexRender(header.column.columnDef.header, header.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800 bg-white dark:bg-zinc-950">
            {table.getRowModel().rows.map((row) => (
              <tr key={row.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/50 transition-colors">
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="px-4 py-3 align-middle">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
            {data.length === 0 && (
              <tr>
                <td colSpan={columns.length} className="px-4 py-12 text-center text-zinc-500">
                  No products found. Sync from Shopify to get started.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between px-2">
        <span className="text-xs text-zinc-500">
          Page {pagination.page} of {pagination.totalPages} ({pagination.total} total)
        </span>
        <div className="flex gap-2">
          <button
            onClick={() => onPageChange(pagination.page - 1)}
            disabled={pagination.page <= 1}
            className="p-2 border rounded-lg disabled:opacity-30 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            onClick={() => onPageChange(pagination.page + 1)}
            disabled={pagination.page >= pagination.totalPages}
            className="p-2 border rounded-lg disabled:opacity-30 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
