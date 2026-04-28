import React from "react";
import { X, PlusCircle } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Command,
  CommandGroup,
  CommandItem,
  CommandList
} from "@/components/ui/command";
import { Command as CommandPrimitive } from "cmdk";
import { cn } from "@/lib/utils";

const shuffleArray = (array) => {
  if (!array) return [];
  const newArr = [...array];
  for (let i = newArr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
  }
  return newArr;
};

export function MultiSelectCombobox({ options, value, onValueChange, onCreate, placeholder, className, maxDisplay }) {
  const inputRef = React.useRef(null);
  const [inputValue, setInputValue] = React.useState("");
  const selected = value || [];
  const [open, setOpen] = React.useState(false);
  const [isFocused, setIsFocused] = React.useState(false);

  const [randomizedOptions, setRandomizedOptions] = React.useState([]);

  React.useEffect(() => {
    // We only want to shuffle once when the component mounts and options are available
    if (options && options.length > 0) {
      setRandomizedOptions(shuffleArray(options).slice(0, 10));
    }
  }, [options]);

  const handleUnselect = (option) => {
    onValueChange(selected.filter((s) => s.value !== option.value));
  };

  const handleSelect = (option) => {
    setInputValue("");
    if (onValueChange && !selected.some(s => s.value === option.value)) {
      onValueChange([...selected, option]);
    }
  };

  const handleCreate = () => {
    if (onCreate && inputValue) {
      onCreate(inputValue);
      setInputValue("");
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      e.stopPropagation();

      const trimmedInput = inputValue.trim();
      if (trimmedInput) {
        // Find if there's an option that's an exact match in the filtered list
        const exactMatchInFiltered = options.find(
          opt => !selected.some(s => s.value === opt.value) && 
                 opt.label.toLowerCase() === trimmedInput.toLowerCase()
        );

        if (exactMatchInFiltered) {
          handleSelect(exactMatchInFiltered);
        } else {
          handleCreate();
        }
      }
    }
    if (e.key === "Backspace" && !inputValue && selected.length > 0) {
      handleUnselect(selected[selected.length - 1]);
    }
    if (e.key === "Escape") {
      inputRef.current?.blur();
    }
  };

  const filteredOptions = options.filter(
    (option) =>
      !selected.some((s) => s.value === option.value) &&
      option.label.toLowerCase().includes(inputValue.toLowerCase())
  );
  
  const displayOptions = inputValue 
    ? filteredOptions 
    : randomizedOptions.filter(opt => !selected.some(s => s.value === opt.value));

  const showCreateOption = onCreate && inputValue && !options.some(opt => opt.label.toLowerCase() === inputValue.toLowerCase());

  // Use a simplified, safe value for the data-value attribute
  const createOptionValue = `create-new-topic:${inputValue}`;

  return (
    <Command onKeyDown={handleKeyDown} className="overflow-visible bg-transparent">
      <div 
        className={cn(
            "group rounded-xl border-2 px-3 py-2 text-base transition-all bg-white flex items-start min-h-[56px]",
            isFocused ? "border-blue-500 ring-2 ring-blue-200" : "border-gray-200",
            className
        )}
        onClick={() => inputRef.current?.focus()}
      >
        <div className={`flex gap-1 items-center flex-1 ${maxDisplay ? 'flex-nowrap overflow-hidden' : 'flex-wrap'}`}>
          {(maxDisplay ? selected.slice(0, maxDisplay) : selected).map((option) => (
            <Badge key={option.value} variant="secondary" className="whitespace-nowrap shrink-0">
              {option.label}
              <button
                className="ml-1 rounded-full outline-none ring-offset-background focus:ring-2 focus:ring-ring focus:ring-offset-2"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleUnselect(option);
                  }
                }}
                onMouseDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  handleUnselect(option);
                }}
              >
                <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
              </button>
            </Badge>
          ))}
          {maxDisplay && selected.length > maxDisplay && (
            <Badge variant="secondary" className="whitespace-nowrap shrink-0">
              +{selected.length - maxDisplay}
            </Badge>
          )}
          <CommandPrimitive.Input
            ref={inputRef}
            placeholder={!selected.length ? placeholder : ""}
            value={inputValue}
            onValueChange={setInputValue}
            onBlur={() => {
                setOpen(false);
                setIsFocused(false);
            }}
            onFocus={() => {
                setOpen(true);
                setIsFocused(true);
            }}
            className="ml-1 bg-transparent outline-none placeholder:text-muted-foreground flex-1 h-8"
            style={{minWidth: '100px'}}
          />
        </div>
      </div>
      <div className="relative mt-1">
        {open && (
          <div className="absolute w-full z-50 top-0 rounded-md border bg-popover text-popover-foreground shadow-lg outline-none animate-in">
            <CommandList>
                {(displayOptions.length > 0 || showCreateOption) ? (
                  <>
                    {displayOptions.length > 0 && (
                        <CommandGroup heading={inputValue ? "Resultados da busca" : "Sugestões Aleatórias"}>
                        {displayOptions.map((option) => (
                            <CommandItem
                            key={option.value}
                            onMouseDown={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                            }}
                            onSelect={() => handleSelect(option)}
                            className="cursor-pointer"
                            >
                            {option.label}
                            </CommandItem>
                        ))}
                        </CommandGroup>
                    )}
                    {showCreateOption && (
                        <CommandItem
                            key={createOptionValue}
                            value={createOptionValue} // Use the safe value here
                            onMouseDown={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                            }}
                            onSelect={handleCreate}
                            className="cursor-pointer"
                        >
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Criar e adicionar "{inputValue}"
                        </CommandItem>
                    )}
                  </>
                ) : (
                    inputValue.length > 0 && !onCreate && (
                        <div className="p-2 text-sm text-center text-muted-foreground">Nenhum resultado encontrado.</div>
                    )
                )}
            </CommandList>
          </div>
        )}
      </div>
    </Command>
  );
}