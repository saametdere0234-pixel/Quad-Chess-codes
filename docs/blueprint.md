# **App Name**: Quad Chess King Hunt

## Core Features:

- Custom Board Initialization: Render a 14x14 grid using CSS Grid, dynamically creating the plus-shaped (+) layout by making the 3x3 corner cells visually empty and inactive.
- Emoji/Text Piece Display: Represent all chess pieces using simple emojis or text characters, clearly distinguishing between the four players' pieces and piece types.
- Interactive Piece Movement: Implement front-end logic for players to select their pieces and move them to valid squares based on simplified King Hunt chess rules. The structure will allow for easy integration with a real-time multiplayer backend.
- King Capture & Player Elimination: Apply King Hunt logic where a player is eliminated immediately upon the capture of their King piece. No check or checkmate states are calculated.
- Turn Management System: Manage the sequence of turns for the four players, ensuring only the current player can make moves and visually indicating whose turn it is.
- Game End Detection: Automatically detect when only one player's King remains on the board, declaring that player as the winner and ending the game.
- AI Turn Commentary Tool: After each player's turn, a generative AI tool provides a brief, analytical comment on the move made, its tactical implications, or changes to the board state in the context of King Hunt logic.

## Style Guidelines:

- Primary Color: A deep, strategic blue (#2D5786) to convey focus and tactical depth. (HSL: 220, 50%, 35%)
- Background Color: An off-white with a very subtle blue tint (#F3F5F8) to maintain a clean, minimalist canvas and promote readability. (HSL: 220, 15%, 95%)
- Accent Color: A vibrant purple (#975FED) to highlight active pieces, player turns, or important UI elements, creating clear visual hierarchy. (HSL: 250, 70%, 65%)
- All text uses 'Inter', a modern grotesque sans-serif font known for its legibility and neutral, objective appearance, aligning with the minimalist and high-performance brief.
- Chess pieces are represented by simple, Unicode-standard emojis or text characters for low overhead and clear differentiation between piece types and player colors.
- The game board is a 14x14 grid using CSS Grid, forming a plus-shaped layout by ensuring the 3x3 corner cells are styled as invisible and inactive, preserving the minimalist and lightweight UI.
- Subtle, fast animations for piece movement to provide visual feedback without hindering performance on low-end hardware, maintaining a crisp user experience.