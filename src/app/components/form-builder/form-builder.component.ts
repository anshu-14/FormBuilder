import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FieldConfigPanelComponent } from '../field-config-panel/field-config-panel.component';
import { FormPreviewComponent } from '../form-preview/form-preview.component';
import { FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { FormField } from '../../models/form-field';

@Component({
  selector: 'app-form-builder',
  imports: [CommonModule,FieldConfigPanelComponent,FormPreviewComponent],
  templateUrl: './form-builder.component.html',
  styleUrl: './form-builder.component.css'
})
export class FormBuilderComponent {
  fieldTypes = [
    { type: 'text' as const, label: 'Text Input', icon: '📝' },
    { type: 'email' as const, label: 'Email Input', icon: '📧' },
    { type: 'number' as const, label: 'Number Input', icon: '🔢' },
    { type: 'textarea' as const, label: 'Textarea', icon: '📄' },
    { type: 'select' as const, label: 'Select Dropdown', icon: '📋' },
    { type: 'checkbox' as const, label: 'Checkbox', icon: '☑️' },
    { type: 'radio' as const, label: 'Radio Button', icon: '🔘' },
    { type: 'heading' as const, label: 'Heading', icon: '📰' },
    { type: 'separator' as const, label: 'Separator', icon: '➖' },
    { type: 'repeatable-group' as const, label: 'Repeatable Group', icon: '🔁' }
  ];

  formFields: FormField[] = [];
  selectedField: FormField | null = null;
  openModalFieldId: string | null = null; // ask config panel to open modal for this id
  previewForm: FormGroup;
  private fieldCounter = 0;
  private fieldFormControlMap: Map<string, string> = new Map(); // Maps field id to form control name

  constructor(private fb: FormBuilder) {
    this.previewForm = this.fb.group({});
  }

  addField(type: FormField['type']) {
    this.fieldCounter++;
    const field: FormField = {
      id: `field_${this.fieldCounter}`,
      type,
      label: this.getDefaultLabel(type),
      formControlName: `field_${this.fieldCounter}`,
      placeholder: type !== 'checkbox' && type !== 'heading' && type !== 'separator' && type !== 'repeatable-group'
        ? `Enter ${this.getDefaultLabel(type).toLowerCase()}` 
        : undefined,
      required: false,
      validationMessage: 'This field is required',
      options: type === 'select' || type === 'radio' ? ['Option 1', 'Option 2', 'Option 3'] : undefined,
      heading: type === 'heading' ? 'Section Heading' : undefined,
      level: type === 'heading' ? 2 : undefined,
      isArray: type === 'repeatable-group',
      formArrayName: type === 'repeatable-group' ? `array_${this.fieldCounter}` : undefined,
      allowAddRow: type === 'repeatable-group' ? true : undefined,
      children: type === 'repeatable-group' ? [] : undefined
    };

    this.formFields.push(field);
    
    if (type !== 'heading' && type !== 'separator' && type !== 'repeatable-group') {
      this.previewForm.addControl(field.formControlName, this.fb.control(''));
      this.fieldFormControlMap.set(field.id, field.formControlName);
    } else if (type === 'repeatable-group') {
      const arrayName = field.formArrayName || field.formControlName;
      this.previewForm.addControl(arrayName, new FormArray([]));
      this.fieldFormControlMap.set(field.id, arrayName);
    }
    
    this.selectedField = field;
  }

  getDefaultLabel(type: string): string {
    const labels: { [key: string]: string } = {
      text: 'Text Field',
      email: 'Email Address',
      number: 'Number',
      textarea: 'Text Area',
      select: 'Select Option',
      checkbox: 'Checkbox Option',
      radio: 'Radio Option',
      heading: 'Heading',
      separator: 'Separator',
      'repeatable-group': 'Repeatable Group'
    };
    return labels[type] || 'Field';
  }

  onFieldSelected(fieldId: string) {
    const found = this.findFieldById(fieldId);
    this.selectedField = found || null;
    // Ask config panel to open edit modal for this field id.
    // Clear first so repeated clicks on same id still trigger change detection.
    this.openModalFieldId = null;
    setTimeout(() => this.openModalFieldId = fieldId, 0);
  }

  // recursive lookup for fields and children
  private findFieldById(id: string, list: FormField[] = this.formFields): FormField | null {
    for (const f of list) {
      if (f.id === id) return f;
      if (f.children && f.children.length) {
        const found = this.findFieldById(id, f.children);
        if (found) return found;
      }
    }
    return null;
  }

  onFieldChanged() {
    if (this.selectedField && this.selectedField.type !== 'heading' && this.selectedField.type !== 'separator') {
      if (this.selectedField.type === 'repeatable-group') {
        // Handle FormArray name change
        const oldArrayName = this.fieldFormControlMap.get(this.selectedField.id);
        const newArrayName = this.selectedField.formArrayName || this.selectedField.formControlName;
        
        if (oldArrayName && oldArrayName !== newArrayName) {
          const oldArray = this.previewForm.get(oldArrayName) as FormArray;
          if (oldArray) {
            const value = oldArray.value;
            // Remove old array
            this.previewForm.removeControl(oldArrayName);
            // Add new array with same value
            this.previewForm.addControl(newArrayName, new FormArray([]));
            // Restore values if needed
            const newArray = this.previewForm.get(newArrayName) as FormArray;
            if (newArray && value && Array.isArray(value)) {
              value.forEach((item: any) => {
                const group = this.createGroupFormGroup(this.selectedField?.children || []);
                group.patchValue(item);
                newArray.push(group);
              });
            }
            // Update the map
            this.fieldFormControlMap.set(this.selectedField.id, newArrayName);
          }
        }
      } else {
        const oldFormControlName = this.fieldFormControlMap.get(this.selectedField.id);
        const newFormControlName = this.selectedField.formControlName;
        
        // If form control name changed, update the reactive form
        if (oldFormControlName && oldFormControlName !== newFormControlName) {
          const oldControl = this.previewForm.get(oldFormControlName);
          if (oldControl) {
            const value = oldControl.value;
            const validators = this.selectedField.required ? [Validators.required] : [];
            
            // Remove old control
            this.previewForm.removeControl(oldFormControlName);
            
            // Add new control with same value and validators
            this.previewForm.addControl(newFormControlName, this.fb.control(value, validators));
            
            // Update the map
            this.fieldFormControlMap.set(this.selectedField.id, newFormControlName);
          }
        } else {
          // Just update validators if form control name didn't change
          const validators = this.selectedField.required ? [Validators.required] : [];
          const control = this.previewForm.get(this.selectedField.formControlName);
          if (control) {
            control.setValidators(validators);
            control.updateValueAndValidity();
          }
        }
      }
    }
  }

  removeField() {
    if (this.selectedField) {
      this.removeFieldById(this.selectedField.id);
    }
  }

  removeFieldById(fieldId: string) {
    const field = this.formFields.find(f => f.id === fieldId);
    if (field) {
      const index = this.formFields.findIndex(f => f.id === fieldId);
      if (index > -1) {
        if (field.type !== 'heading' && field.type !== 'separator') {
          if (field.type === 'repeatable-group') {
            const arrayName = field.formArrayName || field.formControlName;
            this.previewForm.removeControl(arrayName);
          } else {
            this.previewForm.removeControl(field.formControlName);
          }
          this.fieldFormControlMap.delete(fieldId);
        }
        this.formFields.splice(index, 1);
        if (this.selectedField?.id === fieldId) {
          this.selectedField = null;
        }
      }
    }
  }

  onFieldEdit(fieldId: string) {
    if (fieldId) {
      this.selectedField = this.formFields.find(f => f.id === fieldId) || null;
    } else {
      this.selectedField = null;
    }
  }
  onCodeCopied(code: string) {
    console.log('Code copied:', code);
    
    // Copy to clipboard
    navigator.clipboard.writeText(code)
      .then(() => {
        // Show success message/notification
        console.log('Successfully copied to clipboard');
        
        // Optional: Show a temporary success indicator
        
      })
      .catch((error) => {
        // Handle error
        console.error('Failed to copy to clipboard:', error);
        
        
        
      });
  }

  addFieldToGroup(parentFieldId: string, type: FormField['type']) {
    const parentField = this.formFields.find(f => f.id === parentFieldId);
    if (!parentField || parentField.type !== 'repeatable-group' || !parentField.children) {
      return;
    }

    this.fieldCounter++;
    const field: FormField = {
      id: `field_${this.fieldCounter}`,
      type,
      label: this.getDefaultLabel(type),
      formControlName: `field_${this.fieldCounter}`,
      placeholder: type !== 'checkbox' && type !== 'heading' && type !== 'separator' 
        ? `Enter ${this.getDefaultLabel(type).toLowerCase()}` 
        : undefined,
      required: false,
      validationMessage: 'This field is required',
      options: type === 'select' || type === 'radio' ? ['Option 1', 'Option 2', 'Option 3'] : undefined,
      heading: type === 'heading' ? 'Section Heading' : undefined,
      level: type === 'heading' ? 2 : undefined
    };

    parentField.children.push(field);
    this.selectedField = field;
  }

  removeFieldFromGroup(parentFieldId: string, fieldId: string) {
    const parentField = this.formFields.find(f => f.id === parentFieldId);
    if (!parentField || !parentField.children) {
      return;
    }

    const index = parentField.children.findIndex(f => f.id === fieldId);
    if (index > -1) {
      parentField.children.splice(index, 1);
      if (this.selectedField?.id === fieldId) {
        this.selectedField = null;
      }
    }
  }

  createGroupFormGroup(fields: FormField[]): FormGroup {
    const group: { [key: string]: any } = {};
    fields.forEach(field => {
      if (field.type !== 'heading' && field.type !== 'separator') {
        const validators = field.required ? [Validators.required] : [];
        group[field.formControlName] = this.fb.control('', validators);
      }
    });
    return this.fb.group(group);
  }

  addRowToFormArray(parentFieldId: string) {
    const parentField = this.formFields.find(f => f.id === parentFieldId);
    if (!parentField || !parentField.children) {
      return;
    }

    const arrayName = parentField.formArrayName || parentField.formControlName;
    const formArray = this.previewForm.get(arrayName) as FormArray;
    if (formArray) {
      const newRow = this.createGroupFormGroup(parentField.children);
      formArray.push(newRow);
    }
  }

  removeRowFromFormArray(parentFieldId: string, index: number) {
    const parentField = this.formFields.find(f => f.id === parentFieldId);
    if (!parentField) {
      return;
    }

    const arrayName = parentField.formArrayName || parentField.formControlName;
    const formArray = this.previewForm.get(arrayName) as FormArray;
    if (formArray) {
      formArray.removeAt(index);
    }
  }

  getFormArray(fieldId: string): FormArray {
    const field = this.formFields.find(f => f.id === fieldId);
    if (!field) return this.fb.array([]);
    const arrayName = field.formArrayName || field.formControlName;
    return this.previewForm.get(arrayName) as FormArray;
  }
}




