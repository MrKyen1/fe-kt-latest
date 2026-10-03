import React, { useState, useRef, useEffect, useCallback } from "react";
import { Select } from "antd";
import type { SelectProps } from "antd";

/**
 * SafeSelect: Wrapper chuẩn chuyên gia cho Ant Design Select (đặc biệt khi dùng mode="multiple" hoặc showSearch).
 * - Cho phép người dùng gõ tìm kiếm (search option) bình thường khi mở dropdown.
 * - Ngăn chặn 100% trình duyệt tự động điền text từ cache / autofill vào ô input tìm kiếm của Select
 *   bằng cơ chế "Dropdown-Gated Search" kết hợp khóa readOnly DOM khi dropdown đang đóng.
 */
function SafeSelectComponent<ValueType = any, OptionType extends object = any>(
  props: SelectProps<ValueType, OptionType>
) {
  const {
    showSearch,
    searchValue: propSearchValue,
    onSearch: propOnSearch,
    onDropdownVisibleChange,
    autoClearSearchValue = true,
    optionFilterProp = "label",
    ...restProps
  } = props;

  const isSearchEnabled = showSearch !== undefined ? Boolean(showSearch) : props.mode === "multiple" || props.mode === "tags";

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [internalSearch, setInternalSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  const syncInputReadOnly = useCallback(
    (openState: boolean) => {
      if (!containerRef.current) return;
      const inputs = containerRef.current.querySelectorAll<HTMLInputElement>(
        "input.ant-select-selection-search-input"
      );
      inputs.forEach((input) => {
        input.setAttribute("autocomplete", "new-password");
        input.setAttribute("data-lpignore", "true");
        input.setAttribute("data-form-type", "other");
        if (!isSearchEnabled) {
          input.readOnly = true;
          return;
        }
        // Chỉ mở khóa gõ phím khi dropdown đang mở
        input.readOnly = !openState;
        if (!openState && input.value) {
          input.value = "";
        }
      });
    },
    [isSearchEnabled]
  );

  useEffect(() => {
    syncInputReadOnly(dropdownOpen);
  }, [dropdownOpen, syncInputReadOnly]);

  const handleDropdownVisibleChange = (open: boolean) => {
    setDropdownOpen(open);
    if (!open) {
      setInternalSearch("");
    }
    syncInputReadOnly(open);
    onDropdownVisibleChange?.(open);
  };

  const handleSearch = (val: string) => {
    // Chặn mọi dữ liệu autofill từ cache trình duyệt khi dropdown chưa mở
    if (!dropdownOpen) {
      setInternalSearch("");
      return;
    }
    setInternalSearch(val);
    propOnSearch?.(val);
  };

  const effectiveSearchValue =
    propSearchValue !== undefined
      ? propSearchValue
      : dropdownOpen
        ? internalSearch
        : "";

  return (
    <div ref={containerRef} className="w-full">
      <Select<ValueType, OptionType>
        {...restProps}
        showSearch={isSearchEnabled}
        optionFilterProp={optionFilterProp}
        autoClearSearchValue={autoClearSearchValue}
        searchValue={effectiveSearchValue}
        onSearch={handleSearch}
        onDropdownVisibleChange={handleDropdownVisibleChange}
      />
    </div>
  );
}

export const SafeSelect = Object.assign(SafeSelectComponent, {
  Option: Select.Option,
  OptGroup: Select.OptGroup,
});

export default SafeSelect;
