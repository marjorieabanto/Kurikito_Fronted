import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SellInformationComponent } from './sell.information.component';

describe('SellInformationComponent', () => {
  let component: SellInformationComponent;
  let fixture: ComponentFixture<SellInformationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SellInformationComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SellInformationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
