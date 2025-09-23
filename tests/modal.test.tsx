import React, { useState } from "react";
import { render, fireEvent, screen, cleanup } from "@testing-library/react";
import ModalRequestForm from "@/modules/dj/components/ModalRequestForm";
import { describe, it, expect, vi, afterEach } from "vitest";
import "@testing-library/jest-dom/vitest";

describe("ModalRequestForm", () => {
  afterEach(() => cleanup());

  it("calls onClose when pressing Escape", () => {
    const handleClose = vi.fn();
    render(
      <ModalRequestForm open onClose={handleClose} onSuccess={() => {}} />
    );
    fireEvent.keyDown(document, { key: "Escape" });
    expect(handleClose).toHaveBeenCalled();
  });

  it("calls onClose when clicking the backdrop but not when clicking inside", () => {
    const handleClose = vi.fn();
    render(
      <ModalRequestForm open onClose={handleClose} onSuccess={() => {}} />
    );
    // backdrop es el primer div con fixed y el modal es el hijo
    const backdrop = document.querySelector(".fixed") as HTMLElement;
    const modalBox = backdrop.querySelector(".bg-card-bg") as HTMLElement;
    fireEvent.click(backdrop);
    expect(handleClose).toHaveBeenCalledTimes(1);
    handleClose.mockClear();
    fireEvent.click(modalBox);
    expect(handleClose).not.toHaveBeenCalled();
  });

  it("focuses the song input on open and supports focus trap", () => {
    function Wrapper() {
      const [open, setOpen] = useState(false);
      return (
        <>
          <button onClick={() => setOpen(true)}>Open</button>
          <ModalRequestForm
            open={open}
            onClose={() => setOpen(false)}
            onSuccess={() => {}}
          />
        </>
      );
    }

    render(<Wrapper />);
    const trigger = screen.getByText("Open");
    trigger.focus();
    fireEvent.click(trigger);

    // Busca el input de canción
    const songInput = screen.getByLabelText("Canción");
    expect(songInput).toHaveFocus();
    expect(document.body.style.overflow).toBe("hidden");

    // Focus trap: Shift+Tab desde el input va al botón de cerrar
    fireEvent.keyDown(document, { key: "Tab", shiftKey: true });
    const closeBtn = screen.getByLabelText("Cerrar");
    expect(closeBtn).toHaveFocus();

    // Tab desde el botón de cerrar vuelve al input
    fireEvent.keyDown(document, { key: "Tab" });
    expect(songInput).toHaveFocus();

    // Cerrar modal con botón de cerrar
    fireEvent.click(closeBtn);
    expect(trigger).toHaveFocus();
    expect(document.body.style.overflow).toBe("");
  });

  it("sets aria-labelledby when titleId is provided", () => {
    render(
      <ModalRequestForm
        open
        onClose={() => {}}
        onSuccess={() => {}}
        titleId="title-id"
        title="Mi Título"
      />
    );
    // Busca el Dialog por aria-labelledby
    const dialog = document.querySelector('[aria-labelledby="title-id"]');
    expect(dialog).toBeInTheDocument();
  });
});
