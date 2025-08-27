import React, { useState } from 'react';
import { render, fireEvent, screen, cleanup } from '@testing-library/react';
import Modal from '@dj/components/modal';
import { describe, it, expect, vi, afterEach } from 'vitest';
import '@testing-library/jest-dom/vitest';

describe('Modal', () => {
  afterEach(() => cleanup());
  it('calls onClose when pressing Escape', () => {
    const handleClose = vi.fn();
    render(
      <Modal open onClose={handleClose}>
        <button>inside</button>
      </Modal>
    );
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(handleClose).toHaveBeenCalled();
  });

  it('calls onClose when clicking the backdrop but not when clicking inside', () => {
    const handleClose = vi.fn();
    render(
      <Modal open onClose={handleClose}>
        <button>inside</button>
      </Modal>
    );
    const dialog = screen.getByRole('dialog');
    const backdrop = dialog.parentElement as HTMLElement;
    fireEvent.click(backdrop);
    expect(handleClose).toHaveBeenCalledTimes(1);
    handleClose.mockClear();
    fireEvent.click(dialog);
    expect(handleClose).not.toHaveBeenCalled();
  });

  it('supports close button, focus trap, and restoring focus/scroll', () => {
    function Wrapper() {
      const [open, setOpen] = useState(false);
      return (
        <>
          <button onClick={() => setOpen(true)}>Open</button>
          <Modal open={open} onClose={() => setOpen(false)} titleId="modal-title">
            <h1 id="modal-title">Title</h1>
            <button>Second</button>
          </Modal>
        </>
      );
    }

    render(<Wrapper />);
    const trigger = screen.getByText('Open');
    trigger.focus();
    fireEvent.click(trigger);

    const dialog = screen.getByRole('dialog');
    const closeBtn = dialog.querySelector('button') as HTMLButtonElement;
    expect(closeBtn).toHaveFocus();
    expect(document.body.style.overflow).toBe('hidden');

    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true });
    expect(screen.getByText('Second')).toHaveFocus();
    fireEvent.keyDown(document, { key: 'Tab' });
    expect(closeBtn).toHaveFocus();

    fireEvent.click(closeBtn);
    expect(trigger).toHaveFocus();
    expect(document.body.style.overflow).toBe('');
  });

  it('sets aria-labelledby when titleId is provided', () => {
    render(
      <Modal open onClose={() => {}} titleId="title-id">
        <h1 id="title-id">My Title</h1>
        <button>Ok</button>
      </Modal>
    );
    expect(screen.getByRole('dialog')).toHaveAttribute('aria-labelledby', 'title-id');
  });
});
