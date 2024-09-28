
import React from 'react';

export default function ChatTab({/* props */}) {
    return (
        <div>
            <ScrollArea className="h-[calc(100vh-200px)] w-full border rounded-md p-4 mb-4 bg-white">
                  {messages.map((message, index) => (
                    <div
                      key={index}
                      className={`mb-4 ${
                        message.sender === "user" ? "text-right" : "text-left"
                      }`}
                    >
                      <span
                        className={`inline-block p-2 rounded-lg ${
                          message.sender === "user"
                            ? "bg-blue-500 text-white"
                            : "bg-gray-200 text-gray-800"
                        }`}
                      >
                        {message.text}
                      </span>
                    </div>
                  ))}
                  {isLoading && (
                    <div className="flex justify-center items-center">
                      <Loader
                        className="animate-spin text-blue-500"
                        size={24}
                      />
                    </div>
                  )}
                </ScrollArea>
                <div className="flex space-x-2 mb-4">
                  <Input
                    type="text"
                    placeholder="Type your message..."
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
                  />
                  <Button
                    onClick={handleSendMessage}
                    disabled={!isAIReady || isLoading}
                  >
                    {isLoading ? (
                      <Loader className="animate-spin" size={16} />
                    ) : (
                      "Send"
                    )}
                  </Button>
                  <Button
                    onClick={() => setUseSearch(!useSearch)}
                    className="ml-2"
                  >
                    {useSearch ? "Disable Search" : "Enable Search"}
                  </Button>
                </div>
                <div className="flex space-x-2 mb-4">
                  <Input
                    type="text"
                    placeholder="Current idea..."
                    value={currentIdea}
                    onChange={handleCurrentIdeaChange}
                  />
                  <Select
                    value={selectedCategory}
                    onValueChange={setSelectedCategory}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="technology">Technology</SelectItem>
                      <SelectItem value="health">Health</SelectItem>
                      <SelectItem value="education">Education</SelectItem>
                      <SelectItem value="finance">Finance</SelectItem>
                      <SelectItem value="entertainment">
                        Entertainment
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <Button onClick={handleSaveIdea}>Save Idea</Button>
                  <Button onClick={handleSearch} disabled={isLoading}>
                    Search
                  </Button>
                </div>
                <Progress value={ideaProgress} className="w-full" />
                {searchResults && (
                  <div className="mt-4">
                    <h3 className="text-lg font-semibold mb-2">
                      Search Results:
                    </h3>
                    <pre className="whitespace-pre-wrap bg-gray-100 p-2 rounded">
                      {searchResults}
                    </pre>
                  </div>
                )}
        </div>
    );
}
