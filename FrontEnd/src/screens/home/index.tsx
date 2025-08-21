import { ColorSwatch, Group } from "@mantine/core";
import { Button } from "@/components/ui/button";
import { useEffect, useRef, useState, useCallback } from "react";
import axios from "axios";
import Draggable from "react-draggable";
import { SWATCHES } from "@/constants";
import { MenuIcon } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetFooter,
  SheetClose,
  SheetTrigger,
} from "@/components/ui/sheet";

import Slider from "@mui/material/Slider";
import { FaPencilAlt } from "react-icons/fa";
import { FaEraser } from "react-icons/fa";
import toast from "react-hot-toast";

interface GeneratedResult {
  expression: string;
  answer: string;
}

interface Response {
  expr: string;
  result: string;
  assign: boolean;
}

// MathJax type definitions
declare global {
  interface MathJaxConfig {
    tex2jax: {
      inlineMath: [string, string][];
    };
  }

  interface MathJaxHub {
    Config: (config: MathJaxConfig) => void;
    Queue: (args: (string | unknown[])[]) => void;
    Typeset: (element?: HTMLElement | null) => void;
  }

  interface Window {
    MathJax: {
      Hub: MathJaxHub;
    };
  }
}

export default function Home() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState("rgb(255, 255, 255)");
  const [reset, setReset] = useState(false);
  const [dictOfVars, setDictOfVars] = useState({});
  const [result, setResult] = useState<GeneratedResult>();
  const [latexPosition, setLatexPosition] = useState({ x: 10, y: 200 });
  const [latexExpression, setLatexExpression] = useState<Array<string>>([]);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [penSize, setPenSize] = useState<number>(3);
  const [eraserSize, seteraserSize] = useState<number>(1);
  const [eraserSelected, seteraserSelecetd] = useState(false);
  const previousPositionRef = useRef<{ x: number; y: number } | null>(null);
  const [touchStartTime, setTouchStartTime] = useState(0);
  const [lastTap, setLastTap] = useState(0);


  useEffect(() => {
    if (result) {
      renderLatexToCanvas(result.expression, result.answer);
    }
  }, [result]);

  useEffect(() => {
    if (reset) {
      resetCanvas();
      setLatexExpression([]);
      setResult(undefined);
      setDictOfVars({});
      setPenSize(3);
      seteraserSize(1);
      setReset(false);
    }
  }, [reset]);

  useEffect(() => {
    const canvas = canvasRef.current;

    if (canvas) {
      const ctx = canvas.getContext("2d");
      if (ctx) {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.lineWidth = 3;
      }
    }

    const handleResize = () => {
      if (canvas) {
        const ctx = canvas.getContext("2d");
        if (ctx) {
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          canvas.width = window.innerWidth;
          canvas.height = window.innerHeight;
          ctx.putImageData(imageData, 0, 0);
          ctx.lineCap = "round";
          ctx.lineJoin = "round";
          ctx.lineWidth = penSize;
        }
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;

    if (canvas) {
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.lineWidth = penSize;
      }
    }
  }, [penSize]);

  useEffect(() => {
    const initMathJax = (): HTMLScriptElement => {
      const script = document.createElement("script");
      script.src =
        "https://cdnjs.cloudflare.com/ajax/libs/mathjax/2.7.9/MathJax.js?config=TeX-MML-AM_CHTML";
      script.async = true;

      script.onload = () => {
        if (window.MathJax) {
          const config: MathJaxConfig = {
            tex2jax: {
              inlineMath: [
                ["$", "$"],
                ["\$$", "\$$"],
              ],
            },
          };
          window.MathJax.Hub.Config(config);
        }
      };

      document.head.appendChild(script);
      return script;
    };

    const script = initMathJax();
    return () => {
      if (script && document.head.contains(script)) {
        document.head.removeChild(script);
      }
    };
  }, []);

  useEffect(() => {
    if (latexExpression.length > 0 && window.MathJax) {
      const typesetArg: [string, unknown] = ["Typeset", window.MathJax.Hub];
      setTimeout(() => {
        window.MathJax.Hub.Queue([typesetArg]);
      }, 0);
    }
  }, [latexExpression]);

  const renderLatexToCanvas = (expression: string, answer: string) => {
    const latex = `${expression} = ${answer}`;
    setLatexExpression([...latexExpression, latex]);

    // Clear the main canvas
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }
  };

  const getCoordinates = useCallback((e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (canvas) {
      const rect = canvas.getBoundingClientRect();
      if ('touches' in e) {
        return {
          x: e.touches[0].clientX - rect.left,
          y: e.touches[0].clientY - rect.top
        };
      } else {
        return {
          x: e.clientX - rect.left,
          y: e.clientY - rect.top
        };
      }
    }
    return { x: 0, y: 0 };
  }, []);

  const resetCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }
  }, []);

  const startDrawing = useCallback((e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.style.background = "black";
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.beginPath();
        const { x, y } = getCoordinates(e);
        ctx.moveTo(x, y);
        setIsDrawing(true);
        previousPositionRef.current = { x, y };
      }
    }
  }, [getCoordinates]);

  const draw = useCallback((e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    if (!isDrawing) {
      return;
    }
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      if (ctx) {
        const { x, y } = getCoordinates(e);
        if (eraserSelected) {
          ctx.globalCompositeOperation = 'destination-out';
          ctx.beginPath();
          ctx.arc(x, y, eraserSize / 2, 0, Math.PI * 2, false);
          ctx.fill();
        } else {
          ctx.globalCompositeOperation = 'source-over';
          ctx.strokeStyle = color;
          ctx.beginPath();
          if (previousPositionRef.current) {
            ctx.moveTo(previousPositionRef.current.x, previousPositionRef.current.y);
          } else {
            ctx.moveTo(x, y);
          }
          ctx.lineTo(x, y);
          ctx.stroke();
        }
        previousPositionRef.current = { x, y };
      }
    }
  }, [isDrawing, eraserSelected, eraserSize, color, getCoordinates]);

  const stopDrawing = useCallback(() => {
    setIsDrawing(false);
    previousPositionRef.current = null;
  }, []);

  const runRoute = async () => {
    const canvas = canvasRef.current;

    if (canvas) {
      const toastId = toast.loading('Processing your equation...');
      const response = await axios({
        method: "post",
        url: `${import.meta.env.VITE_API_URL}/calculate`,
        data: {
          image: canvas.toDataURL("image/png"),
          dict_of_vars: dictOfVars,
        },
      });

      toast.success('Solution found! 🎯', {
        id: toastId,
        duration: 3000,
      });

      const resp = await response.data;
      console.log("Response", resp);
      resp.data.forEach((data: Response) => {
        if (data.assign === true) {
          setDictOfVars({
            ...dictOfVars,
            [data.expr]: data.result,
          });
        }
      });
      const ctx = canvas.getContext("2d");
      const imageData = ctx!.getImageData(0, 0, canvas.width, canvas.height);
      let minX = canvas.width,
        minY = canvas.height,
        maxX = 0,
        maxY = 0;

      for (let y = 0; y < canvas.height; y++) {
        for (let x = 0; x < canvas.width; x++) {
          const i = (y * canvas.width + x) * 4;
          if (imageData.data[i + 3] > 0) {
            minX = Math.min(minX, x);
            minY = Math.min(minY, y);
            maxX = Math.max(maxX, x);
            maxY = Math.max(maxY, y);
          }
        }
      }

      const centerX = canvas.width / 2 - 100;  // Subtracting half the assumed width of the LaTeX container
      const centerY = canvas.height / 2 - 25;  // Subtracting half the assumed height of the LaTeX container

      setLatexPosition({ x: centerX, y: centerY });
      resp.data.forEach((data: Response) => {
        setTimeout(() => {
          setResult({
            expression: data.expr,
            answer: data.result,
          });
        }, 1000);
      });
    }
  };

  const openRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  const handleOpenChange = (open: boolean) => {
    setIsMenuOpen(open);
  };

  const sliderChangeHandler = (_: Event, newValue: number | number[]) => {
    if (typeof newValue === "number") {
      if (eraserSelected) {
        seteraserSize(newValue);
      } else {
        setPenSize(newValue);
      }
    }
  };

  const handleTouchStart = () => {
    setTouchStartTime(Date.now());
  };

  const handleTouchEnd = (id:number) => {
    const touchDuration = Date.now() - touchStartTime;
    if (touchDuration > 500) {  // Long press: more than 500ms
      handleDelete(id);
    }
  };

  const handleDoubleTap = (id:number) => {
    const now = Date.now();
    const DOUBLE_TAP_DELAY = 300;
    if (now - lastTap < DOUBLE_TAP_DELAY) {
      handleDelete(id);
    }
    setLastTap(now);
  };

  const handleDelete = (id:number) => {
    //Implementation to delete latex expression at index id
    console.log("Delete item at index:", id);
    //Example implementation:  setLatexExpression(latexExpression.filter((_, index) => index !== id));
  };


  return (
    <>
      <Sheet onOpenChange={handleOpenChange}>
        <SheetTrigger>
          <Button variant="outline" className="hidden" ref={openRef}>
            Open
          </Button>
        </SheetTrigger>

        <SheetContent side={"left"} className="bg-slate-950">
          <SheetHeader>
            <SheetTitle>
              <div className="font-semibold text-2xl text-white text-start mb-4">
                SnapSolver
              </div>
            </SheetTitle>
            <SheetDescription></SheetDescription>
          </SheetHeader>

          <div className=" grid-cols-1 gap-4 mt-3 grid">
            <SheetClose>
              {" "}
              <Button
                onClick={() => {
                  setReset(true);
                  setIsMenuOpen(false);
                }}
                className="z-20 bg-red-600 hover:bg-red-700 text-white font-bold text-xl select-none w-full"
                variant="default"
                color="black"
              >
                Reset
              </Button>
            </SheetClose>
            <SheetClose>
              <Button
                onClick={() => {
                  runRoute();
                  setIsMenuOpen(false);
                }}
                className="z-20 text-white font-bold text-xl bg-green-500 hover:bg-green-700 select-none w-full"
                color="white"
              >
                Run
              </Button>
            </SheetClose>
            <Group className="z-20 flex ">
              {SWATCHES.map((swatch) => (
                <ColorSwatch
                className={`cursor-pointer hover:scale-110 ${color === swatch ? "border-2 border-white" : ""}`}
                  key={swatch}
                  color={swatch}
                  onClick={() => setColor(swatch)}
                />
              ))}

              <button
                className={` p-3 rounded-full  hover:scale-105 ${
                  !eraserSelected
                    ? "bg-white text-black"
                    : " bg-slate-900 text-white"
                }`}
                onClick={() => seteraserSelecetd(false)}
              >
                <FaPencilAlt size={20} />
              </button>

              <button
                className={` p-3 rounded-full  hover:scale-105 ${
                  eraserSelected
                    ? "bg-white text-black"
                    : " bg-slate-900 text-white"
                }`}
                onClick={() => seteraserSelecetd(true)}
              >
                <FaEraser size={20} />
              </button>
            </Group>

            <div className="bg-slate-300 px-4 rounded-lg flex items-center gap-4 mt-5">
              <Slider
                style={{ zIndex: 20 }}
                aria-label="pen size"
                orientation="horizontal"
                valueLabelDisplay="auto"
                defaultValue={eraserSelected ? 1 : 3}
                min={1}
                max={10}
                step={1}
                onChange={sliderChangeHandler}
              />

              <span>
                {eraserSelected ? (
                  <FaEraser size={17} />
                ) : (
                  <FaPencilAlt size={17} />
                )}
              </span>
            </div>
          </div>

          <SheetFooter>
            <SheetClose>
              <Button
                onClick={() => setIsMenuOpen(false)}
                ref={closeRef}
                className="mt-10"
              >Done</Button>
            </SheetClose>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Slider positioned absolutely */}
      <div
        style={{ position: "absolute", top: "35%", left: "40px", zIndex: 20 }}
        className="bg-slate-300 px-1 py-3 rounded-lg hidden md:flex flex-col items-center gap-4"
      >
        <Slider
          style={{ zIndex: 20, height: "200px" }}
          aria-label="pen size"
          orientation="vertical"
          valueLabelDisplay="auto"
          defaultValue={eraserSelected ? 1 : 3}
          min={1}
          max={10}
          step={1}
          onChange={sliderChangeHandler}
        />

        <span>
          {eraserSelected ? <FaEraser size={17} /> : <FaPencilAlt size={17} />}
        </span>
      </div>

      <div className="w-full h-14 bg-slate-900 z-20 top-0 left-0 block fixed md:hidden  ">
        <div className="flex w-10/12 mx-auto justify-between items-center h-full">
          <div className="font-semibold text-2xl text-white ">SnapSolver</div>
          <div
            className="p-2 bg-slate-700 rounded-full cursor-pointer hover:scale-105"
            onClick={() => {
              if (isMenuOpen) {
                closeRef?.current?.click();
              } else {
                openRef?.current?.click();
              }
            }}
          >
            <MenuIcon className="text-white" />
          </div>
        </div>
      </div>
      <div className="gap-11 hidden md:flex justify-between items-center mx-8">
        <Button
          onClick={() => setReset(true)}
          className="z-20 bg-red-600 hover:bg-red-700 text-white font-bold text-xl flex-1 select-none "
          variant="default"
          color="black"
        >
          Reset
        </Button>
        <Group className="z-20">
          <button
            className={` p-3 rounded-full  hover:scale-105 ${
              !eraserSelected
                ? "bg-white text-black"
                : " bg-slate-900 text-white"
            }`}
            onClick={() => seteraserSelecetd(false)}
          >
            <FaPencilAlt size={20} />
          </button>
          {SWATCHES.map((swatch) => (
            <ColorSwatch
              className={`cursor-pointer hover:scale-110 ${color === swatch ? "border-2 border-white" : ""}`}
              key={swatch}
              color={swatch}
              onClick={() => setColor(swatch)}
            />
          ))}
          <button
            className={` p-3 rounded-full  hover:scale-105 ${
              eraserSelected
                ? "bg-white text-black"
                : " bg-slate-900 text-white"
            }`}
            onClick={() => seteraserSelecetd(true)}
          >
            <FaEraser size={20} />
          </button>
        </Group>
        <Button
          onClick={runRoute}
          className="z-20 bg-green-600 hover:bg-green-700 text-white font-bold text-xl flex-1 select-none"
          variant="default"
          color="white"
        >
          Run
        </Button>
      </div>
      <canvas
        ref={canvasRef}
        id="canvas"
        className="absolute top-0 left-0 w-full h-full bg-black touch-none"
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={stopDrawing}
        onMouseOut={stopDrawing}
        onTouchStart={startDrawing}
        onTouchMove={draw}
        onTouchEnd={stopDrawing}
      />

      {latexExpression &&
        latexExpression.map((latex, index) => (
          <Draggable
            key={index}
            defaultPosition={latexPosition}
            onStop={(_, data) => setLatexPosition({ x: data.x, y: data.y })}
          >
            <div
              className="absolute p-2 text-white rounded shadow-md bg-black bg-opacity-50 max-w-[90vw] md:max-w-[70vw] lg:max-w-[50vw] break-words cursor-move"
              style={{
                maxHeight: '80vh',
                overflowY: 'auto'
              }}
              onTouchStart={() => handleTouchStart()}
              onTouchEnd={() => handleTouchEnd(index)}
              onClick={() => handleDoubleTap(index)}
            >
              <div className="latex-content text-sm md:text-base lg:text-lg whitespace-normal">{latex}</div>
            </div>
          </Draggable>
        ))}
    </>
  );
}