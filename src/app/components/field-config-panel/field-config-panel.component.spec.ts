import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FieldConfigPanelComponent } from './field-config-panel.component';

describe('FieldConfigPanelComponent', () => {
  let component: FieldConfigPanelComponent;
  let fixture: ComponentFixture<FieldConfigPanelComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FieldConfigPanelComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FieldConfigPanelComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
