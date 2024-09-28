
import React from 'react';

export default function TrendsTab({/* props */}) {
    return (
        <div>
            <Button
                  onClick={fetchIndustryTrends}
                  disabled={isLoading}
                  className="mb-4"
                >
                  {isLoading ? "Loading..." : "Fetch Industry Trends"}
                </Button>
                <ScrollArea className="h-[calc(100vh-200px)] w-full border rounded-md p-4">
                  {isLoading ? (
                    <div className="flex justify-center items-center h-full">
                      <Loader
                        className="animate-spin text-blue-500"
                        size={24}
                      />
                    </div>
                  ) : (
                    industryTrends.map((trend, index) => (
                      <div key={index} className="mb-4">
                        <h3 className="font-semibold">{trend.name}</h3>
                        <Progress value={trend.growth} className="w-full" />
                        <p className="text-sm text-gray-500">
                          Growth: {trend.growth}%
                        </p>
                      </div>
                    ))
                  )}
                </ScrollArea>
        </div>
    );
}
