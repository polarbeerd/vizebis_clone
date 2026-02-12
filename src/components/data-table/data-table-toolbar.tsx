"use client";

import { Table } from "@tanstack/react-table";
import { Download, RotateCcw, Search, SlidersHorizontal, X } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

export interface FilterableColumn {
  id: string;
  title: string;
  options: { label: string; value: string }[];
}

interface DataTableToolbarProps<TData> {
  table: Table<TData>;
  searchKey?: string;
  searchPlaceholder?: string;
  filterableColumns?: FilterableColumn[];
  onExportCsv?: () => void;
  children?: React.ReactNode;
}

export function DataTableToolbar<TData>({
  table,
  searchKey,
  searchPlaceholder,
  filterableColumns = [],
  onExportCsv,
  children,
}: DataTableToolbarProps<TData>) {
  const t = useTranslations("dataTable");
  const isFiltered = table.getState().columnFilters.length > 0;

  return (
    <div className="flex flex-col gap-4">
      {children}
      <div className="flex flex-wrap items-center gap-2">
        {searchKey && (
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder={searchPlaceholder || t("search")}
              value={
                (table.getColumn(searchKey)?.getFilterValue() as string) ?? ""
              }
              onChange={(event) =>
                table.getColumn(searchKey)?.setFilterValue(event.target.value)
              }
              className="h-9 pl-8"
            />
          </div>
        )}

        {filterableColumns.map((column) => {
          const tableColumn = table.getColumn(column.id);
          if (!tableColumn) return null;

          const selectedValues = new Set(
            (tableColumn.getFilterValue() as string[]) ?? []
          );

          return (
            <Popover key={column.id}>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="h-9 border-dashed">
                  <SlidersHorizontal className="mr-2 size-3.5" />
                  {column.title}
                  {selectedValues.size > 0 && (
                    <>
                      <Separator orientation="vertical" className="mx-2 h-4" />
                      <Badge
                        variant="secondary"
                        className="rounded-sm px-1 font-normal lg:hidden"
                      >
                        {selectedValues.size}
                      </Badge>
                      <div className="hidden gap-1 lg:flex">
                        {selectedValues.size > 2 ? (
                          <Badge
                            variant="secondary"
                            className="rounded-sm px-1 font-normal"
                          >
                            {selectedValues.size} {t("selected")}
                          </Badge>
                        ) : (
                          column.options
                            .filter((option) => selectedValues.has(option.value))
                            .map((option) => (
                              <Badge
                                variant="secondary"
                                key={option.value}
                                className="rounded-sm px-1 font-normal"
                              >
                                {option.label}
                              </Badge>
                            ))
                        )}
                      </div>
                    </>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[200px] p-0" align="start">
                <div className="p-2">
                  <p className="text-sm font-medium mb-2">{column.title}</p>
                  <div className="space-y-1">
                    {column.options.map((option) => {
                      const isSelected = selectedValues.has(option.value);
                      return (
                        <button
                          key={option.value}
                          onClick={() => {
                            const newValues = new Set(selectedValues);
                            if (isSelected) {
                              newValues.delete(option.value);
                            } else {
                              newValues.add(option.value);
                            }
                            const filterValues = Array.from(newValues);
                            tableColumn.setFilterValue(
                              filterValues.length ? filterValues : undefined
                            );
                          }}
                          className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent"
                        >
                          <div
                            className={`flex size-4 shrink-0 items-center justify-center rounded-sm border ${
                              isSelected
                                ? "bg-primary border-primary text-primary-foreground"
                                : "border-input"
                            }`}
                          >
                            {isSelected && (
                              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                                <path
                                  d="M8.5 2.5L3.5 7.5L1.5 5.5"
                                  stroke="currentColor"
                                  strokeWidth="1.5"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />
                              </svg>
                            )}
                          </div>
                          <span>{option.label}</span>
                        </button>
                      );
                    })}
                  </div>
                  {selectedValues.size > 0 && (
                    <>
                      <Separator className="my-2" />
                      <button
                        onClick={() => tableColumn.setFilterValue(undefined)}
                        className="flex w-full items-center justify-center rounded-sm py-1.5 text-sm hover:bg-accent"
                      >
                        {t("clearFilter")}
                      </button>
                    </>
                  )}
                </div>
              </PopoverContent>
            </Popover>
          );
        })}

        {isFiltered && (
          <Button
            variant="ghost"
            onClick={() => table.resetColumnFilters()}
            className="h-9 px-2 lg:px-3"
          >
            <RotateCcw className="mr-2 size-3.5" />
            {t("resetFilters")}
          </Button>
        )}

        <div className="ml-auto flex items-center gap-2">
          {onExportCsv && (
            <Button variant="outline" size="sm" className="h-9" onClick={onExportCsv}>
              <Download className="mr-2 size-3.5" />
              {t("exportCsv")}
            </Button>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-9">
                <SlidersHorizontal className="mr-2 size-3.5" />
                {t("columns")}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[180px]">
              <DropdownMenuLabel>{t("toggleColumns")}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {table
                .getAllColumns()
                .filter(
                  (column) =>
                    typeof column.accessorFn !== "undefined" &&
                    column.getCanHide()
                )
                .map((column) => {
                  return (
                    <DropdownMenuCheckboxItem
                      key={column.id}
                      className="capitalize"
                      checked={column.getIsVisible()}
                      onCheckedChange={(value) =>
                        column.toggleVisibility(!!value)
                      }
                    >
                      {column.id}
                    </DropdownMenuCheckboxItem>
                  );
                })}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}
