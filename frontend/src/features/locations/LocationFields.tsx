import { useEffect, useRef } from 'react'
import type { UseFormRegisterReturn } from 'react-hook-form'
import { Field, Select } from '@/components/ui'
import { useProvinces } from './useProvinces'

/** Province → District pair for react-hook-form; District options follow the chosen Province. */
export function LocationFields({
  province,
  district,
  selectedProvince,
  onProvinceChanged,
  errors,
  disabled,
}: {
  province: UseFormRegisterReturn
  district: UseFormRegisterReturn
  selectedProvince: string | undefined
  /** Called when the province changes so the form can clear the district. */
  onProvinceChanged: () => void
  errors?: { province?: string; district?: string }
  disabled?: boolean
}) {
  const { data: provinces = [], isLoading } = useProvinces()
  const districts = provinces.find((p) => p.name === selectedProvince)?.districts ?? []

  const previous = useRef(selectedProvince)
  useEffect(() => {
    if (previous.current !== selectedProvince) onProvinceChanged()
    previous.current = selectedProvince
  }, [selectedProvince, onProvinceChanged])

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <Field label="Province" htmlFor={province.name} error={errors?.province}>
        <Select id={province.name} {...province} disabled={disabled || isLoading} aria-invalid={!!errors?.province}>
          <option value="">Select province</option>
          {provinces.map((p) => (
            <option key={p.name} value={p.name}>
              {p.name}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="District" htmlFor={district.name} error={errors?.district}>
        <Select id={district.name} {...district} disabled={disabled || !selectedProvince} aria-invalid={!!errors?.district}>
          <option value="">{selectedProvince ? 'Select district' : 'Choose a province first'}</option>
          {districts.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </Select>
      </Field>
    </div>
  )
}
