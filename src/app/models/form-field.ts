export type FieldType = 'text' | 'textarea' | 'select' | 'checkbox' | 'heading' | 'separator' | 'number' | 'email' | 'radio' | 'repeatable-group';
export type OptionsSource = 'static' | 'api';

export interface FormField {
  id: string;                
  type: FieldType;
  label?: string;
  formControlName: string;              
  placeholder?: string;
  required?: boolean;
  validationMessage?: string; // Custom validation message (default: "This field is required")
  options?: string[];        // Static options
  optionsSource?: OptionsSource; // 'static' or 'api' (default: 'static')
  apiEndpoint?: string; // API endpoint URL for fetching options
  apiMethod?: 'GET' | 'POST'; // HTTP method (default: 'GET')
  optionsPath?: string; // JSON path to extract options from API response (e.g., 'data.items' or 'items')
  valueKey?: string; // Key for option value in API response (default: 'value' or 'id')
  labelKey?: string; // Key for option label in API response (default: 'label' or 'name')
  heading?: string;
  level?: number;
  isArray?: boolean;
  formArrayName?: string; // For repeatable groups - name of the FormArray
  allowAddRow?: boolean; // For repeatable groups - whether to show Add Row button (default: true)
  children?: FormField[]; // For repeatable groups
}
