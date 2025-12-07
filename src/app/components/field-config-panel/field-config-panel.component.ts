import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FormField } from '../../models/form-field';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-field-config-panel',
  imports: [CommonModule, FormsModule],
  templateUrl: './field-config-panel.component.html',
  styleUrl: './field-config-panel.component.css'
})
export class FieldConfigPanelComponent implements OnChanges {
  @Input() fields: FormField[] = [];
  @Input() selectedField: FormField | null = null;
  @Input() openFieldModalId: string | null = null; // ask to open modal for this field id
  @Output() fieldChanged = new EventEmitter<void>();
  @Output() fieldRemoved = new EventEmitter<string>();
  @Output() fieldEdit = new EventEmitter<string>();
  @Output() codeCopied = new EventEmitter<string>();

  constructor(private toastService: ToastService) {}

  editingField: FormField | null = null;
  optionsString = '';
  lastClickedFieldId: string | null = null;
  clickTimeout: any = null;
  oldFormControlName: string = '';
  showCode: boolean = false;
  generatedCode: string = '';
  editingChildField: FormField | null = null;
  editingChildFieldIndex: number = -1;
  private fieldCounter = 0;

  ngOnChanges(changes: SimpleChanges) {
    // Don't automatically open modal when selectedField changes
    // Modal will only open on explicit edit (double-click) or when
    // `openFieldModalId` is provided by the parent (preview click)
    if (changes['selectedField'] && !this.selectedField) {
      this.editingField = null;
      this.optionsString = '';
    }

    if (changes['openFieldModalId'] && this.openFieldModalId) {
      this.openEditModal(this.openFieldModalId);
    }
  }

  // Recursively search fields and children for a field by id
  private findFieldById(id: string, list: FormField[] = this.fields): FormField | null {
    for (const f of list) {
      if (f.id === id) return f;
      if (f.children && f.children.length) {
        const found = this.findFieldById(id, f.children);
        if (found) return found;
      }
    }
    return null;
  }

  editField(fieldId: string) {
    // Edit button click - open modal immediately
    this.openEditModal(fieldId);
  }

  openEditModal(fieldId: string) {
    const field = this.findFieldById(fieldId);
    if (field) {
      // shallow copy is fine; children array will be replaced on save
      this.editingField = { ...field };
      this.oldFormControlName = field.formControlName || '';
      if (this.editingField.options) {
        this.optionsString = this.editingField.options.join(', ');
      } else {
        this.optionsString = '';
      }
      // Set default optionsSource if not set
      if (!this.editingField.optionsSource) {
        this.editingField.optionsSource = 'static';
      }
      // Also emit to select field in preview so preview highlights it
      this.fieldEdit.emit(fieldId);
    }
  }

  getFieldDisplayName(field: FormField): string {
    if (field.type === 'heading') {
      return field.heading || 'Heading';
    }
    if (field.type === 'separator') {
      return 'Separator';
    }
    return field.label || field.formControlName || 'Unnamed Field';
  }

  getFieldTypeIcon(field: FormField): string {
    const icons: { [key: string]: string } = {
      text: '📝',
      email: '📧',
      number: '🔢',
      textarea: '📄',
      select: '📋',
      checkbox: '☑️',
      radio: '🔘',
      heading: '📰',
      separator: '➖',
      'repeatable-group': '🔁'
    };
    return icons[field.type] || '📌';
  }

  onFieldChange() {
    if (!this.editingField) return;
    const originalField = this.findFieldById(this.editingField.id);
    if (originalField) {
      Object.assign(originalField, this.editingField);
      this.fieldChanged.emit();
    }
  }

  onFormControlChange() {
    if (!this.editingField) return;
    const originalField = this.findFieldById(this.editingField.id);
    if (!originalField) return;

    const newFormControlName = this.editingField.formControlName;
    const oldFormControlName = this.oldFormControlName;
    Object.assign(originalField, this.editingField);
    if (newFormControlName !== oldFormControlName) {
      this.fieldChanged.emit();
      this.oldFormControlName = newFormControlName;
    } else {
      this.fieldChanged.emit();
    }
  }

  updateOptions() {
    if (!this.editingField) return;
    this.editingField.options = this.optionsString.split(',').map(opt => opt.trim()).filter(opt => opt);
    const originalField = this.findFieldById(this.editingField.id);
    if (originalField) {
      Object.assign(originalField, this.editingField);
    }
    this.fieldChanged.emit();
  }

  remove(fieldId: string) {
    this.fieldRemoved.emit(fieldId);
    if (this.editingField?.id === fieldId) {
      this.editingField = null;
    }
  }

  copyCode() {
    if (this.editingField) {
      const code = this.generateFieldCode(this.editingField);
      navigator.clipboard.writeText(code).then(() => {
        this.toastService.success('Field code copied to clipboard!');
      }).catch(() => {
        this.toastService.error('Failed to copy code to clipboard');
      });
      this.codeCopied.emit(code);
    }
  }

  cancelEdit() {
    this.editingField = null;
    this.fieldEdit.emit('');
  }

  saveField() {
    if (this.editingField) {
      // Update all field properties
      const originalField = this.findFieldById(this.editingField.id);
      if (originalField) {
        const oldFormControlName = this.oldFormControlName;
        const newFormControlName = this.editingField.formControlName;
        Object.assign(originalField, this.editingField);
        if (oldFormControlName && oldFormControlName !== newFormControlName) {
          this.oldFormControlName = newFormControlName;
        }
        this.fieldChanged.emit();
        this.cancelEdit();
      }
    }
  }

  closeModal(event: Event) {
    // Close modal when clicking on the backdrop
    if (event.target === event.currentTarget) {
      this.cancelEdit();
    }
  }

  showCodeModal() {
    this.generatedCode = this.generateFullFormCode();
    this.showCode = true;
  }

  closeCodeModal() {
    this.showCode = false;
  }

  copyFullCode() {
    navigator.clipboard.writeText(this.generatedCode).then(() => {
      this.toastService.success('Code copied to clipboard!');
    }).catch(() => {
      this.toastService.error('Failed to copy code to clipboard');
    });
  }

  private generateFullFormCode(): string {
    let fullCode = `// Component TypeScript\n`;
    
    // Check if any field uses API options (check optionsSource === 'api' OR if apiEndpoint is set)
    const hasApiOptions = this.fields.some(f => 
      (f.type === 'select' || f.type === 'radio') && (f.optionsSource === 'api' || !!f.apiEndpoint)
    ) || this.fields.some(f => 
      f.children?.some(c => (c.type === 'select' || c.type === 'radio') && (c.optionsSource === 'api' || !!c.apiEndpoint))
    );
    
    if (hasApiOptions) {
      fullCode += `import { Component, OnInit } from '@angular/core';\n`;
      fullCode += `import { FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';\n`;
      fullCode += `import { HttpClient } from '@angular/common/http';\n`;
      fullCode += `import { Observable, of } from 'rxjs';\n`;
      fullCode += `import { map, catchError } from 'rxjs/operators';\n`;
    } else {
      fullCode += `import { Component } from '@angular/core';\n`;
      fullCode += `import { FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';\n`;
    }
    
    fullCode += `\n`;
    fullCode += `export class YourComponent`;
    if (hasApiOptions) {
      fullCode += ` implements OnInit`;
    }
    fullCode += ` {\n`;
    fullCode += `form: FormGroup;\n`;
    
    // Add options arrays for API-based fields
    if (hasApiOptions) {
      fullCode += `\n`;
      this.fields.forEach(field => {
        if ((field.type === 'select' || field.type === 'radio') && (field.optionsSource === 'api' || !!field.apiEndpoint)) {
          const varName = `${field.formControlName}Options`;
          fullCode += `${varName}: any[] = [];\n`;
        }
        if (field.children) {
          field.children.forEach(child => {
            if ((child.type === 'select' || child.type === 'radio') && (child.optionsSource === 'api' || !!child.apiEndpoint)) {
              const varName = `${child.formControlName}Options`;
              fullCode += `${varName}: any[] = [];\n`;
            }
          });
        }
      });
    }
    
    fullCode += `\n`;
    fullCode += `constructor(private fb: FormBuilder`;
    if (hasApiOptions) {
      fullCode += `, private http: HttpClient`;
    }
    fullCode += `) {\n`;
    fullCode += `  this.form = this.fb.group({\n`;
    
    this.fields.forEach((field, index) => {
      if (field.type !== 'heading' && field.type !== 'separator') {
        if (field.type === 'repeatable-group') {
          const arrayName = field.formArrayName || field.formControlName;
          fullCode += `    ${arrayName}: this.fb.array([])`;
        } else {
          const validator = field.required ? ', Validators.required' : '';
          fullCode += `    ${field.formControlName}: [''${validator}]`;
        }
        const remainingFields = this.fields.filter((f, i) => i > index && f.type !== 'heading' && f.type !== 'separator');
        if (remainingFields.length > 0) fullCode += ',';
        fullCode += '\n';
      }
    });
    
    fullCode += `  });\n}\n\n`;
    
    // Add ngOnInit for API options loading
    if (hasApiOptions) {
      fullCode += `  ngOnInit() {\n`;
      this.fields.forEach(field => {
        if ((field.type === 'select' || field.type === 'radio') && (field.optionsSource === 'api' || !!field.apiEndpoint) && field.apiEndpoint) {
          fullCode += `    this.load${this.capitalizeFirst(field.formControlName)}Options();\n`;
        }
        if (field.children) {
          field.children.forEach(child => {
            if ((child.type === 'select' || child.type === 'radio') && (child.optionsSource === 'api' || !!child.apiEndpoint) && child.apiEndpoint) {
              fullCode += `    this.load${this.capitalizeFirst(child.formControlName)}Options();\n`;
            }
          });
        }
      });
      fullCode += `  }\n\n`;
      
      // Generate load methods for each API-based field
      this.fields.forEach(field => {
        if ((field.type === 'select' || field.type === 'radio') && (field.optionsSource === 'api' || !!field.apiEndpoint) && field.apiEndpoint) {
          fullCode += this.generateApiLoadMethod(field);
        }
        if (field.children) {
          field.children.forEach(child => {
            if ((child.type === 'select' || child.type === 'radio') && (child.optionsSource === 'api' || !!child.apiEndpoint) && child.apiEndpoint) {
              fullCode += this.generateApiLoadMethod(child);
            }
          });
        }
      });
    }
    
    // Add helper methods for FormArray
    const repeatableGroupsForHelpers = this.fields.filter(f => f.type === 'repeatable-group');
    if (repeatableGroupsForHelpers.length > 0) {
      fullCode += `  addArrayRow(arrayName: string) {\n`;
      fullCode += `    const formArray = this.form.get(arrayName) as FormArray;\n`;
      fullCode += `    let groupConfig: { [key: string]: any } = {};\n`;
      fullCode += `    \n`;
      
      repeatableGroupsForHelpers.forEach((field, fieldIndex) => {
        const arrayName = field.formArrayName || field.formControlName;
        fullCode += `    ${fieldIndex === 0 ? 'if' : 'else if'} (arrayName === '${arrayName}') {\n`;
        if (field.children && field.children.length > 0) {
          field.children.forEach((child) => {
            if (child.type !== 'heading' && child.type !== 'separator') {
              const validator = child.required ? ', Validators.required' : '';
              fullCode += `      groupConfig['${child.formControlName}'] = [''${validator}];\n`;
            }
          });
        }
        fullCode += `    }\n`;
      });
      
      fullCode += `    formArray.push(this.fb.group(groupConfig));\n`;
      fullCode += `  }\n\n`;
      
      fullCode += `  removeArrayRow(arrayName: string, index: number) {\n`;
      fullCode += `    const formArray = this.form.get(arrayName) as FormArray;\n`;
      fullCode += `    formArray.removeAt(index);\n`;
      fullCode += `  }\n\n`;
      
      fullCode += `  getFormArray(arrayName: string): FormArray {\n`;
      fullCode += `    return this.form.get(arrayName) as FormArray;\n`;
      fullCode += `  }\n\n`;
    }
    
    // Add patchValue method
    fullCode += `  // Method to patch form values\n`;
    fullCode += `  // Usage: this.patchFormValues({ field1: 'value1', field2: 'value2', arrayName: [{ child1: 'val1', child2: 'val2' }] })\n`;
    fullCode += `  patchFormValues(data: any) {\n`;
    
    // Handle FormArrays first
    const repeatableGroups = this.fields.filter(f => f.type === 'repeatable-group');
    if (repeatableGroups.length > 0) {
      repeatableGroups.forEach(field => {
        const arrayName = field.formArrayName || field.formControlName;
        fullCode += `    // Handle ${arrayName} FormArray\n`;
        fullCode += `    if (data.${arrayName} && Array.isArray(data.${arrayName})) {\n`;
        fullCode += `      const ${arrayName}Array = this.form.get('${arrayName}') as FormArray;\n`;
        fullCode += `      ${arrayName}Array.clear();\n`;
        fullCode += `      data.${arrayName}.forEach((item: any) => {\n`;
        fullCode += `        const group = this.fb.group({\n`;
        if (field.children && field.children.length > 0) {
          const children = field.children;
          children.forEach((child, childIndex) => {
            if (child.type !== 'heading' && child.type !== 'separator') {
              const validator = child.required ? ', Validators.required' : '';
              fullCode += `          ${child.formControlName}: [item.${child.formControlName} || ''${validator}]`;
              if (childIndex < children.length - 1) {
                const remainingChildren = children.filter((c, i) => i > childIndex && c.type !== 'heading' && c.type !== 'separator');
                if (remainingChildren.length > 0) fullCode += ',';
              }
              fullCode += '\n';
            }
          });
        }
        fullCode += `        });\n`;
        fullCode += `        ${arrayName}Array.push(group);\n`;
        fullCode += `      });\n`;
        fullCode += `    }\n\n`;
      });
    }
    
    // Handle regular form controls
    const regularFields = this.fields.filter(f => f.type !== 'heading' && f.type !== 'separator' && f.type !== 'repeatable-group');
    if (regularFields.length > 0) {
      fullCode += `    // Patch regular form controls\n`;
      fullCode += `    const formData: any = {};\n`;
      regularFields.forEach(field => {
        fullCode += `    if (data.${field.formControlName} !== undefined) {\n`;
        fullCode += `      formData.${field.formControlName} = data.${field.formControlName};\n`;
        fullCode += `    }\n`;
      });
      fullCode += `    this.form.patchValue(formData);\n`;
    }
    
    fullCode += `  }\n\n`;
    
    fullCode += `  // Method to get form values\n`;
    fullCode += `  getFormValues(): any {\n`;
    fullCode += `    return this.form.value;\n`;
    fullCode += `  }\n\n`;
    
    fullCode += `  // Method to reset form\n`;
    fullCode += `  resetForm() {\n`;
    fullCode += `    this.form.reset();\n`;
    fullCode += `  }\n\n`;
    
    fullCode += `// Component Template\n`;
    fullCode += `<form [formGroup]="form" (ngSubmit)="onSubmit()" class="space-y-6">\n`;
    
    this.fields.forEach(field => {
      const fieldCode = this.generateFieldCode(field);
      fullCode += `  ${fieldCode.replace(/\n/g, '\n  ')}\n\n`;
    });
    
    fullCode += `  <button type="submit" class="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md">Submit</button>\n`;
    fullCode += `</form>`;
    
    return fullCode;
  }

  generateFieldCode(field: FormField): string {
    if (field.type === 'heading') {
      return `<h${field.level} class="text-${field.level === 1 ? '3xl' : field.level === 2 ? '2xl' : 'xl'} font-bold text-white">${field.heading}</h${field.level}>`;
    }

    if (field.type === 'separator') {
      return `<hr class="border-gray-600">`;
    }

    if (field.type === 'repeatable-group') {
      const arrayName = field.formArrayName || field.formControlName;
      let code = `<div formArrayName="${arrayName}" class="border border-gray-600 rounded-lg p-4 bg-gray-900">\n`;
      code += `  <div class="flex justify-between items-center mb-4">\n`;
      code += `    <h3 class="text-lg font-semibold text-gray-200">${field.label || 'Repeatable Group'}</h3>\n`;
      code += `    <button type="button" (click)="addArrayRow('${arrayName}')" class="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded-md text-sm">+ Add Row</button>\n`;
      code += `  </div>\n\n`;
      
      code += `  <div *ngFor="let group of getFormArray('${arrayName}').controls; let i = index" [formGroupName]="i" class="mb-4 p-4 bg-gray-800 border border-gray-700 rounded-lg">\n`;
      code += `    <div class="flex justify-between items-start mb-3">\n`;
      code += `      <h4 class="text-sm font-medium text-gray-300">Item {{ i + 1 }}</h4>\n`;
      code += `      <button type="button" (click)="removeArrayRow('${arrayName}', i)" class="px-2 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-xs">Remove</button>\n`;
      code += `    </div>\n\n`;
      
      // Generate child fields
      if (field.children && field.children.length > 0) {
        field.children.forEach(child => {
          if (child.type !== 'heading' && child.type !== 'separator') {
            code += `    <div class="mb-3">\n`;
            code += `      <label class="block text-sm font-medium text-gray-300 mb-1">\n`;
            code += `        ${child.label || child.formControlName}${child.required ? ' <span class="text-red-400">*</span>' : ''}\n`;
            code += `      </label>\n`;
            
            switch (child.type) {
              case 'text':
              case 'email':
              case 'number':
                code += `      <input type="${child.type}" formControlName="${child.formControlName}"`;
                if (child.placeholder) code += ` placeholder="${child.placeholder}"`;
                code += ` class="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-gray-100 rounded-md">\n`;
                break;
              case 'textarea':
                code += `      <textarea formControlName="${child.formControlName}"`;
                if (child.placeholder) code += ` placeholder="${child.placeholder}"`;
                code += ` rows="3" class="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-gray-100 rounded-md"></textarea>\n`;
                break;
              case 'select':
                code += `      <select formControlName="${child.formControlName}" class="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-gray-100 rounded-md">\n`;
                code += `        <option value="">Select an option</option>\n`;
                if (child.optionsSource === 'api' || !!child.apiEndpoint) {
                  const varName = `${child.formControlName}Options`;
                  code += `        <option *ngFor="let option of ${varName}" [value]="option.value">{{ option.label }}</option>\n`;
                } else {
                  child.options?.forEach(opt => {
                    code += `        <option value="${opt}">${opt}</option>\n`;
                  });
                }
                code += `      </select>\n`;
                break;
              case 'checkbox':
                code += `      <div class="flex items-center">\n`;
                code += `        <input type="checkbox" formControlName="${child.formControlName}" id="${child.formControlName}_{{i}}" class="h-4 w-4">\n`;
                code += `        <label for="${child.formControlName}_{{i}}" class="ml-2 text-sm text-gray-300">${child.label}</label>\n`;
                code += `      </div>\n`;
                break;
              case 'radio':
                code += `      <div class="space-y-2">\n`;
                child.options?.forEach((opt, idx) => {
                  code += `        <div class="flex items-center">\n`;
                  code += `          <input type="radio" formControlName="${child.formControlName}" value="${opt}" id="${child.formControlName}_{{i}}_${idx}" class="h-4 w-4">\n`;
                  code += `          <label for="${child.formControlName}_{{i}}_${idx}" class="ml-2 text-sm text-gray-300">${opt}</label>\n`;
                  code += `        </div>\n`;
                });
                code += `      </div>\n`;
                break;
            }
            code += `    </div>\n`;
          }
        });
      }
      
      code += `  </div>\n`;
      code += `</div>`;
      return code;
    }

    let code = `<div>\n`;
    code += `  <label class="block text-sm font-medium text-gray-300 mb-1">\n`;
    code += `    ${field.label}${field.required ? ' <span class="text-red-400">*</span>' : ''}\n`;
    code += `  </label>\n`;

    switch (field.type) {
      case 'text':
      case 'email':
      case 'number':
        code += `  <input\n`;
        code += `    type="${field.type}"\n`;
        code += `    formControlName="${field.formControlName}"\n`;
        if (field.placeholder) code += `    placeholder="${field.placeholder}"\n`;
        code += `    class="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-gray-100 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 placeholder-gray-400"\n`;
        code += `  >\n`;
        break;

      case 'textarea':
        code += `  <textarea\n`;
        code += `    formControlName="${field.formControlName}"\n`;
        if (field.placeholder) code += `    placeholder="${field.placeholder}"\n`;
        code += `    rows="4"\n`;
        code += `    class="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-gray-100 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 placeholder-gray-400"\n`;
        code += `  ></textarea>\n`;
        break;

      case 'select':
        code += `  <select\n`;
        code += `    formControlName="${field.formControlName}"\n`;
        code += `    class="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-gray-100 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"\n`;
        code += `  >\n`;
        code += `    <option value="">Select an option</option>\n`;
        if (field.optionsSource === 'api' || !!field.apiEndpoint) {
          const varName = `${field.formControlName}Options`;
          code += `    <option *ngFor="let option of ${varName}" [value]="option.value">{{ option.label }}</option>\n`;
        } else {
          field.options?.forEach(opt => {
            code += `    <option value="${opt}">${opt}</option>\n`;
          });
        }
        code += `  </select>\n`;
        break;

      case 'checkbox':
        code = `<div class="flex items-center">\n`;
        code += `  <input\n`;
        code += `    type="checkbox"\n`;
        code += `    formControlName="${field.formControlName}"\n`;
        code += `    id="${field.formControlName}"\n`;
        code += `    class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-600 bg-gray-700 rounded"\n`;
        code += `  >\n`;
        code += `  <label for="${field.formControlName}" class="ml-2 block text-sm text-gray-300">\n`;
        code += `    ${field.label}${field.required ? ' <span class="text-red-400">*</span>' : ''}\n`;
        code += `  </label>\n`;
        break;

      case 'radio':
        code += `  <div class="space-y-2">\n`;
        field.options?.forEach((opt, idx) => {
          code += `    <div class="flex items-center">\n`;
          code += `      <input\n`;
          code += `        type="radio"\n`;
          code += `        formControlName="${field.formControlName}"\n`;
          code += `        value="${opt}"\n`;
          code += `        id="${field.formControlName}_${idx}"\n`;
          code += `        class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-600 bg-gray-700"\n`;
          code += `      >\n`;
          code += `      <label for="${field.formControlName}_${idx}" class="ml-2 block text-sm text-gray-300">\n`;
          code += `        ${opt}\n`;
          code += `      </label>\n`;
          code += `    </div>\n`;
        });
        code += `  </div>\n`;
        break;
    }

    code += `</div>`;
    return code;
  }

  addChildField(type: FormField['type']) {
    if (!this.editingField || this.editingField.type !== 'repeatable-group') {
      return;
    }

    if (!this.editingField.children) {
      this.editingField.children = [];
    }

    this.fieldCounter++;
    const childField: FormField = {
      id: `child_${this.fieldCounter}`,
      type,
      label: this.getDefaultLabel(type),
      formControlName: `child_${this.fieldCounter}`,
      placeholder: type !== 'checkbox' && type !== 'heading' && type !== 'separator' 
        ? `Enter ${this.getDefaultLabel(type).toLowerCase()}` 
        : undefined,
      required: false,
      validationMessage: 'This field is required',
      options: type === 'select' || type === 'radio' ? ['Option 1', 'Option 2', 'Option 3'] : undefined,
      heading: type === 'heading' ? 'Field Label' : undefined,
      level: type === 'heading' ? 3 : undefined
    };

    this.editingField.children.push(childField);
    this.onFieldChange();
  }

  removeChildField(index: number) {
    if (!this.editingField || !this.editingField.children) {
      return;
    }

    this.editingField.children.splice(index, 1);
    this.onFieldChange();
  }

  editChildField(childField: FormField) {
    // Create a copy for editing
    const fieldCopy = { ...childField };
    // Store the original index
    const index = this.editingField?.children?.findIndex(c => c.id === childField.id) ?? -1;
    
    // Open modal for child field editing
    this.editingChildField = fieldCopy;
    this.editingChildFieldIndex = index;
  }

  saveChildField() {
    if (!this.editingField || !this.editingChildField || this.editingChildFieldIndex === -1) {
      return;
    }

    if (this.editingField.children && this.editingField.children[this.editingChildFieldIndex]) {
      Object.assign(this.editingField.children[this.editingChildFieldIndex], this.editingChildField);
      this.onFieldChange();
    }
    
    this.editingChildField = null;
    this.editingChildFieldIndex = -1;
  }

  cancelChildFieldEdit() {
    this.editingChildField = null;
    this.editingChildFieldIndex = -1;
  }

  updateChildFieldOptions(value: string) {
    if (this.editingChildField) {
      this.editingChildField.options = value.split(',').map(opt => opt.trim()).filter(opt => opt);
    }
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

  private capitalizeFirst(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  private generateApiLoadMethod(field: FormField): string {
    const varName = `${field.formControlName}Options`;
    const methodName = `load${this.capitalizeFirst(field.formControlName)}Options`;
    const endpoint = field.apiEndpoint || '';
    const method = field.apiMethod || 'GET';
    const optionsPath = field.optionsPath || '';
    const valueKey = field.valueKey || 'value';
    const labelKey = field.labelKey || 'label';
    
    let methodCode = `  ${methodName}() {\n`;
    methodCode += `    const request$ = this.http.${method.toLowerCase()}('${endpoint}');\n`;
    methodCode += `    \n`;
    methodCode += `    request$.pipe(\n`;
    
    if (optionsPath) {
      methodCode += `      map((response: any) => {\n`;
      methodCode += `        // Extract options from nested path: ${optionsPath}\n`;
      const pathParts = optionsPath.split('.');
      let pathAccess = 'response';
      pathParts.forEach(part => {
        pathAccess += `['${part}']`;
      });
      methodCode += `        const items = ${pathAccess} || [];\n`;
      methodCode += `        return Array.isArray(items) ? items : [];\n`;
      methodCode += `      }),\n`;
    } else {
      methodCode += `      map((response: any) => Array.isArray(response) ? response : []),\n`;
    }
    
    methodCode += `      map((items: any[]) => {\n`;
    methodCode += `        return items.map(item => ({\n`;
    methodCode += `          value: item['${valueKey}'] || item,\n`;
    methodCode += `          label: item['${labelKey}'] || item['${valueKey}'] || item\n`;
    methodCode += `        }));\n`;
    methodCode += `      }),\n`;
    methodCode += `      catchError((error) => {\n`;
    methodCode += `        console.error('Error loading options for ${field.formControlName}:', error);\n`;
    methodCode += `        return of([]);\n`;
    methodCode += `      })\n`;
    methodCode += `    ).subscribe(options => {\n`;
    methodCode += `      this.${varName} = options;\n`;
    methodCode += `    });\n`;
    methodCode += `  }\n\n`;
    
    return methodCode;
  }
  setOptionsSource(source: 'static' | 'api') {
    if (!this.editingField) return;
    this.editingField.optionsSource = source;
    
    if (source === 'static') {
      // Clear API-related fields when switching to static
      this.editingField.apiEndpoint = undefined;
      this.editingField.apiMethod = 'GET';
      this.editingField.optionsPath = undefined;
      this.editingField.valueKey = undefined;
      this.editingField.labelKey = undefined;
    } else {
      // Initialize API fields with defaults when switching to API
      if (!this.editingField.apiMethod) {
        this.editingField.apiMethod = 'GET';
      }
      if (!this.editingField.valueKey) {
        this.editingField.valueKey = 'id';
      }
      if (!this.editingField.labelKey) {
        this.editingField.labelKey = 'name';
      }
      if (!this.editingField.optionsPath) {
        this.editingField.optionsPath = 'items';
      }
    }
    
    this.onFieldChange();
  }
}
