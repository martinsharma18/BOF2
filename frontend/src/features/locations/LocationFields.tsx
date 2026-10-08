import { useEffect, useRef } from 'react'
import type { UseFormRegisterReturn } from 'react-hook-form'
import { Field, Select } from '@/components/ui'
import { cn } from '@/lib/cn'
import { useProvinces } from './useProvinces'

/** Calls `onChanged` whenever `value` changes after the first render (used to clear dependent dropdowns). */
function useOnChange(value: string | undefined, onChanged: (() => void) | undefined) {
  const previous = useRef(value)
  useEffect(() => {
    if (previous.current !== value) onChanged?.()
    previous.current = value
  }, [value, onChanged])
}

/**
 * Province → District → Local level for react-hook-form. Each dropdown's options follow the one before it.
 * Local level is shown only when `localLevel` is passed.
 */
export function LocationFields({
  province,
  district,
  localLevel,
  selectedProvince,
  selectedDistrict,
  onProvinceChanged,
  onDistrictChanged,
  errors,
  disabled,
  localLevelOptional,
  districtOptional,
  allowAny,
}: {
  province: UseFormRegisterReturn
  district: UseFormRegisterReturn
  localLevel?: UseFormRegisterReturn
  selectedProvince: string | undefined
  selectedDistrict?: string
  onProvinceChanged: () => void
  onDistrictChanged?: () => void
  errors?: { province?: string; district?: string; localLevel?: string }
  disabled?: boolean
  localLevelOptional?: boolean
  /** Area mode: District can be left empty to mean "the whole province" (and Local level "the whole district"). */
  districtOptional?: boolean
  /** Filter mode: empty choices read "All …" instead of "Select …". */
  allowAny?: boolean
}) {
  const { data: provinces = [], isLoading } = useProvinces()
  const current = provinces.find((p) => p.name === selectedProvince)
  const districts = current?.districts ?? []
  const localLevels = (selectedDistrict && current?.localLevels?.[selectedDistrict]) || []

  useOnChange(selectedProvince, onProvinceChanged)
  useOnChange(selectedDistrict, onDistrictChanged)

  return (
    <div className={cn('grid grid-cols-1 gap-4', localLevel ? 'sm:grid-cols-3' : 'sm:grid-cols-2')}>
      <Field label="Province" htmlFor={province.name} error={errors?.province}>
        <Select id={province.name} {...province} disabled={disabled || isLoading} aria-invalid={!!errors?.province}>
          <option value="">{allowAny ? 'All provinces' : 'Select province'}</option>
          {provinces.map((p) => (
            <option key={p.name} value={p.name}>
              {p.name}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="District" htmlFor={district.name} optional={districtOptional} error={errors?.district}>
        <Select id={district.name} {...district} disabled={disabled || !selectedProvince} aria-invalid={!!errors?.district}>
          <option value="">
            {allowAny ? 'All districts' : !selectedProvince ? 'Choose a province first' : districtOptional ? 'Whole province' : 'Select district'}
          </option>
          {districts.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </Select>
      </Field>
      {localLevel && (
        <Field label="Local level" htmlFor={localLevel.name} optional={localLevelOptional} error={errors?.localLevel}>
          <Select id={localLevel.name} {...localLevel} disabled={disabled || !selectedDistrict} aria-invalid={!!errors?.localLevel}>
            <option value="">
              {allowAny ? 'All local levels' : !selectedDistrict ? 'Choose a district first' : districtOptional ? 'Whole district' : 'Select municipality'}
            </option>
            {localLevels.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </Select>
        </Field>
      )}
    </div>
  )
}
