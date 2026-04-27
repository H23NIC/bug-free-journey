import React, { useState, useEffect, useRef } from 'react';
import { HiMenuAlt2, HiX } from 'react-icons/hi';
import { IoDocumentTextOutline, IoPeopleOutline, IoCompassOutline, IoLocationSharp } from 'react-icons/io5';
import { gsap } from 'gsap';
import './RadialMenu.css';

const DEFAULT_POS = { x: 30, y: window.innerHeight / 2 - 30 };

interface RadialMenuProps {
    onOpenDocs: () => void;
}

const RadialMenu: React.FC<RadialMenuProps> = ({ onOpenDocs }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [isHovered, setIsHovered] = useState(false);
    const [position, setPosition] = useState(DEFAULT_POS);
    const [isDragging, setIsDragging] = useState(false);
    const [isMoved, setIsMoved] = useState(false);
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
    
    const menuRef = useRef<HTMLDivElement>(null);
    const dragStartPos = useRef({ x: 0, y: 0 });

    const handleMouseEnter = () => {
        if (!isDragging) {
            setIsHovered(true);
        }
    };

    const handleMouseLeave = () => {
        if (!isDragging) {
            setIsHovered(false);
            setIsOpen(false); // Also close menu on leave if you want it to behave like a hover/click hybrid
        }
    };

    const toggleMenu = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!isDragging) {
            setIsOpen(!isOpen);
        }
    };

    const resetPosition = (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsOpen(false);
        setIsMoved(false);
        setIsHovered(false);
        
        gsap.to(menuRef.current, {
            left: DEFAULT_POS.x,
            top: DEFAULT_POS.y,
            duration: 0.6,
            ease: "power3.inOut",
            onUpdate: () => {
                if (menuRef.current) {
                    const rect = menuRef.current.getBoundingClientRect();
                    setPosition({ x: rect.left, y: rect.top });
                }
            }
        });
    };

    const handleMouseDown = (e: React.MouseEvent) => {
        if (isOpen) return; 
        setIsDragging(true);
        dragStartPos.current = {
            x: e.clientX - position.x,
            y: e.clientY - position.y
        };
    };

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            setMousePos({ x: e.clientX, y: e.clientY });
            
            if (isDragging) {
                const newX = e.clientX - dragStartPos.current.x;
                const newY = e.clientY - dragStartPos.current.y;
                
                setPosition({ x: newX, y: newY });
                
                const dist = Math.sqrt(
                    Math.pow(newX - DEFAULT_POS.x, 2) + 
                    Math.pow(newY - DEFAULT_POS.y, 2)
                );
                if (dist > 10) setIsMoved(true);
            }
        };

        const handleMouseUp = () => {
            setIsDragging(false);
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging]);

    return (
        <>
            <div 
                ref={menuRef}
                className={`radial-menu-container ${isDragging ? 'dragging' : ''}`}
                style={{ left: position.x, top: position.y }}
                onMouseDown={handleMouseDown}
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
            >
                {/* Reset Location Icon - only pops up on hover if moved */}
                <div 
                    className={`reset-icon ${isHovered && !isOpen && isMoved ? 'visible' : ''}`}
                    onClick={resetPosition}
                    title="Reset Position"
                >
                    <IoLocationSharp />
                </div>

                <div 
                    className={`menu-trigger ${isOpen ? 'open' : ''}`} 
                    onClick={toggleMenu}
                    title={isOpen ? "Click to Close" : "Click to Open / Drag to Move"}
                >
                    {isOpen ? <HiX /> : <HiMenuAlt2 />}
                </div>

                {/* Show options if CLICKED (isOpen) */}
                <div className={`radial-options ${isOpen ? 'open' : ''}`}>
                    <div 
                        className="menu-item item-1" 
                        title="Documents"
                        onClick={(e) => {
                            e.stopPropagation();
                            onOpenDocs();
                        }}
                    >
                        <IoDocumentTextOutline />
                    </div>
                    <a href="#contacts" className="menu-item item-2" title="Contacts">
                        <IoPeopleOutline />
                    </a>
                    <a href="#explore" className="menu-item item-3" title="Explore">
                        <IoCompassOutline />
                    </a>
                </div>
            </div>

            {/* Custom Location Cursor during Drag */}
            {isDragging && (
                <div 
                    className="drag-cursor"
                    style={{ left: mousePos.x + 15, top: mousePos.y + 15 }}
                >
                    <IoLocationSharp />
                </div>
            )}
        </>
    );
};

export default RadialMenu;
